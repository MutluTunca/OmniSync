from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.v1.dependencies import RoleChecker
from app.db.session import get_db
from app.models.company import Company
from app.models.instagram_account import InstagramAccount
from app.models.reply import Reply
from app.models.user import User


router = APIRouter()


@router.get("/me")
def get_my_company(
    current_user: User = Depends(RoleChecker("owner", "admin", "manager")),
    db: Session = Depends(get_db)
) -> dict:
    company = db.get(Company, current_user.company_id)
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
