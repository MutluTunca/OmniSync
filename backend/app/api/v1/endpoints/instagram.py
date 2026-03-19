from urllib.parse import urlencode
from uuid import uuid4
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_current_user, RoleChecker
from app.core.config import settings
from app.db.session import get_db
from app.integrations.meta_client import MetaGraphClient
from app.models.company import Company
from app.models.instagram_account import InstagramAccount
from app.models.user import User
from app.workers.celery_app import celery_app


router = APIRouter()

# Role checkers
admin_plus = RoleChecker("owner", "admin")
manager_plus = RoleChecker("owner", "admin", "manager")
all_roles = RoleChecker("owner", "admin", "manager", "operator", "agent")


class ManualConnectRequest(BaseModel):
    ig_user_id: str
    username: str
    page_id: str
    page_access_token: str
    is_active: bool = True


def _token_health(token: str | None, expires_at: datetime | None) -> str:
    if not token:
        return "missing"
    if not expires_at:
        return "unknown"
    now = datetime.now(timezone.utc)
    threshold = now + timedelta(hours=settings.token_refresh_threshold_hours)
    if expires_at <= now:
        return "expired"
    if expires_at <= threshold:
        return "expiring_soon"
    return "active"


def _effective_company_token(company: Company, accounts: list[InstagramAccount]) -> tuple[str | None, datetime | None]:
    if company.meta_access_token_encrypted:
        return company.meta_access_token_encrypted, company.meta_token_expires_at

    for account in accounts:
        if account.is_active and account.access_token_encrypted:
            return account.access_token_encrypted, account.token_expires_at

    for account in accounts:
        if account.access_token_encrypted:
            return account.access_token_encrypted, account.token_expires_at

    return None, None


@router.get("/accounts")
def list_accounts(
    current_user: User = Depends(all_roles),
    db: Session = Depends(get_db),
) -> dict:
    items = db.query(InstagramAccount).filter(InstagramAccount.company_id == current_user.company_id).all()
    company = db.get(Company, current_user.company_id)
    effective_token, effective_expiry = _effective_company_token(company, items)
    company_token_health = _token_health(effective_token, effective_expiry)
    return {
        "items": [
            {
                "id": str(item.id),
                "ig_user_id": item.ig_user_id,
                "username": item.username,
                "page_id": item.page_id,
                "is_active": item.is_active,
                "token_expires_at": effective_expiry,
                "token_health": company_token_health,
                "requires_reconnect": item.is_active and company_token_health != "active",
            }
            for item in items
        ]
    }


@router.get("/token-health")
def token_health(
    current_user: User = Depends(all_roles),
    db: Session = Depends(get_db),
) -> dict:
    company = db.get(Company, current_user.company_id)
    if not company:
        return {"summary": {"total": 0, "active": 0, "expiring_soon": 0, "expired": 0, "unknown": 0, "missing": 0}, "items": []}

    items = db.query(InstagramAccount).filter(InstagramAccount.company_id == current_user.company_id).all()
    effective_token, effective_expiry = _effective_company_token(company, items)
    summary = {"total": len(items), "active": 0, "expiring_soon": 0, "expired": 0, "unknown": 0, "missing": 0}
    rows = []
    company_token_health = _token_health(effective_token, effective_expiry)

    for item in items:
        health = company_token_health
        if health in summary:
            summary[health] += 1
        rows.append(
            {
                "id": str(item.id),
                "ig_user_id": item.ig_user_id,
                "username": item.username,
                "is_active": item.is_active,
                "token_health": health,
                "token_expires_at": effective_expiry,
                "updated_at": item.updated_at,
                "requires_reconnect": item.is_active and health != "active",
            }
        )

    return {
        "summary": summary,
        "integration": {
            "token_health": company_token_health,
            "token_expires_at": effective_expiry,
        },
        "items": rows,
    }


@router.post("/refresh-tokens-now")
def refresh_tokens_now() -> dict[str, str]:
    result = celery_app.send_task("app.workers.tasks.refresh_instagram_tokens")
    return {"status": "queued", "task_id": result.id}


@router.post("/poll-now")
def poll_now() -> dict[str, str]:
    result = celery_app.send_task("app.workers.tasks.poll_instagram_comments")
    return {"status": "queued", "task_id": result.id}


@router.post("/manual-connect")
def manual_connect(payload: ManualConnectRequest, db: Session = Depends(get_db)) -> dict:
    company = db.query(Company).first()
    if not company:
        raise HTTPException(status_code=400, detail="Company not found")

    account = db.query(InstagramAccount).filter(InstagramAccount.ig_user_id == payload.ig_user_id).first()
    company.meta_access_token_encrypted = payload.page_access_token
    company.meta_token_expires_at = datetime.now(timezone.utc) + timedelta(days=settings.token_assumed_expiry_days)
    company.updated_at = datetime.now(timezone.utc)
    db.add(company)

    if account:
        account.username = payload.username
        account.page_id = payload.page_id
        account.access_token_encrypted = payload.page_access_token
        account.token_expires_at = company.meta_token_expires_at
        account.is_active = payload.is_active
        db.add(account)
    else:
        account = InstagramAccount(
            company_id=company.id,
            ig_user_id=payload.ig_user_id,
            username=payload.username,
            page_id=payload.page_id,
            access_token_encrypted=payload.page_access_token,
            token_expires_at=company.meta_token_expires_at,
            is_active=payload.is_active,
        )
        db.add(account)

    db.commit()
    db.refresh(account)
    return {
        "status": "ok",
        "account": {
            "id": str(account.id),
            "ig_user_id": account.ig_user_id,
            "username": account.username,
            "page_id": account.page_id,
            "is_active": account.is_active,
        },
    }


@router.get("/oauth/start")
def oauth_start() -> dict[str, str]:
    state = str(uuid4())
    params = {
        "client_id": settings.meta_app_id,
        "redirect_uri": settings.meta_oauth_redirect_uri,
        "scope": "instagram_basic,instagram_manage_comments,pages_show_list,pages_read_engagement,business_management",
        "response_type": "code",
        "state": state,
    }
    auth_url = f"https://www.facebook.com/{settings.meta_graph_version}/dialog/oauth?{urlencode(params)}"
    return {"auth_url": auth_url, "state": state}


@router.get("/oauth/callback")
async def oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    if not settings.meta_app_id or not settings.meta_app_secret:
        raise HTTPException(status_code=400, detail="Meta app credentials are missing")

    client = MetaGraphClient()
    token_data = await client.exchange_code_for_token(code)
    access_token = token_data.get("access_token")
    expires_in = token_data.get("expires_in")
    if not access_token:
        raise HTTPException(status_code=400, detail="Meta token exchange failed")

    pages = await client.fetch_pages_with_instagram(access_token)
    print(f"DEBUG: Meta pages response: {pages}")
    page_items = pages.get("data", [])

    company = db.query(Company).first()
    if not company:
        raise HTTPException(status_code=400, detail="Company not found")

    token_expires_at = (
        datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        if isinstance(expires_in, int) and expires_in > 0
        else datetime.now(timezone.utc) + timedelta(days=settings.token_assumed_expiry_days)
    )

    company.meta_access_token_encrypted = access_token
    company.meta_token_expires_at = token_expires_at
    company.updated_at = datetime.now(timezone.utc)
    db.add(company)

    connected = []
    for page in page_items:
        ig = page.get("instagram_business_account")
        if not ig or not ig.get("id"):
            continue

        existing = db.query(InstagramAccount).filter(InstagramAccount.ig_user_id == ig["id"]).first()
        if existing:
            existing.username = ig.get("username", existing.username)
            existing.page_id = page.get("id", existing.page_id)
            existing.access_token_encrypted = access_token
            existing.token_expires_at = token_expires_at
            existing.is_active = True
            db.add(existing)
            account = existing
        else:
            account = InstagramAccount(
                company_id=company.id,
                ig_user_id=ig["id"],
                username=ig.get("username", f"ig_{ig['id']}"),
                page_id=page.get("id", ""),
                access_token_encrypted=access_token,
                token_expires_at=token_expires_at,
                is_active=True,
            )
            db.add(account)
        db.flush()
        connected.append(
            {
                "id": str(account.id),
                "ig_user_id": account.ig_user_id,
                "username": account.username,
                "page_id": account.page_id,
            }
        )

    db.commit()
    redirect_url = f"{settings.frontend_url}/instagram/connect?status=ok&connected={len(connected)}"
    return RedirectResponse(url=redirect_url, status_code=302)
