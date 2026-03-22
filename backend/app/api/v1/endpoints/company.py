from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.v1.dependencies import RoleChecker, get_active_company_id
from app.db.session import get_db
from app.models.company import Company
from app.models.instagram_account import InstagramAccount
from app.models.reply import Reply
from app.models.user import User
from pydantic import BaseModel


router = APIRouter()

class CreateCompanyRequest(BaseModel):
    name: str
    plan: str = "free"
    max_accounts: int = 1
    daily_reply_limit: int = 50

class UpdateCompanyRequest(BaseModel):
    name: str | None = None
    logo_url: str | None = None
    plan: str | None = None
    max_accounts: int | None = None
    daily_reply_limit: int | None = None


@router.get("/me")
def get_my_company(
    current_user: User = Depends(RoleChecker("owner", "admin", "manager")),
    active_company_id: UUID = Depends(get_active_company_id),
    db: Session = Depends(get_db)
) -> dict:
    company = db.get(Company, active_company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Calculate used accounts
    used_accounts = db.query(InstagramAccount).filter(InstagramAccount.company_id == company.id).count()

    # Calculate used replies today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    used_replies_today = (
        db.query(func.count(Reply.id))
        .filter(Reply.company_id == company.id)
        .filter(Reply.created_at >= today_start)
        .scalar()
    ) or 0

    return {
        "id": str(company.id),
        "name": company.name,
        "plan": company.plan,
        "status": company.status,
        "max_accounts": company.max_accounts,
        "used_accounts": used_accounts,
        "daily_reply_limit": company.daily_reply_limit,
        "used_replies_today": used_replies_today,
        "ai_model_tier": company.ai_model_tier,
    }

@router.get("/list")
def list_all_companies(
    current_user: User = Depends(RoleChecker("owner")),
    db: Session = Depends(get_db)
) -> list[dict]:
    companies = db.query(Company).all()
    return [
        {
            "id": str(c.id),
            "name": c.name,
            "logo_url": c.logo_url,
            "plan": c.plan,
            "status": c.status
        }
        for c in companies
    ]

@router.post("/create")
def create_company(
    payload: CreateCompanyRequest,
    current_user: User = Depends(RoleChecker("owner")),
    db: Session = Depends(get_db)
) -> dict:
    company = Company(
        name=payload.name,
        plan=payload.plan,
        max_accounts=payload.max_accounts,
        daily_reply_limit=payload.daily_reply_limit
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return {"id": str(company.id), "name": company.name}

@router.put("/update")
def update_company(
    payload: UpdateCompanyRequest,
    current_user: User = Depends(RoleChecker("owner", "admin")),
    active_company_id: UUID = Depends(get_active_company_id),
    db: Session = Depends(get_db)
) -> dict:
    company = db.get(Company, active_company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    if payload.name: company.name = payload.name
    if payload.logo_url: company.logo_url = payload.logo_url
    
    # Only owner can change plan and limits
    if current_user.role == "owner":
        if payload.plan: company.plan = payload.plan
        if payload.max_accounts is not None: company.max_accounts = payload.max_accounts
        if payload.daily_reply_limit is not None: company.daily_reply_limit = payload.daily_reply_limit
        
    db.add(company)
    db.commit()
    return {"status": "success", "company_id": str(company.id)}
