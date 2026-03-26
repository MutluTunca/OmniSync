import shutil
import os
from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
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
    ai_model_tier: str | None = None
    ai_custom_instructions: str | None = None


@router.post("/upload-logo")
def upload_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(RoleChecker("owner", "admin")),
    active_company_id: UUID = Depends(get_active_company_id),
    db: Session = Depends(get_db)
) -> dict:
    company = db.get(Company, active_company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Validate file type
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Create directory if missing
    upload_dir = "uploads/logos"
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)

    # Clean filename and save
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"logo_{active_company_id}{file_ext}"
    file_path = os.path.join(upload_dir, filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update logo_url in DB
    # We use a relative URL that matches our StaticFiles mount
    logo_url = f"/api/v1/uploads/logos/{filename}"
    company.logo_url = logo_url
    db.add(company)
    db.commit()

    return {"status": "success", "logo_url": logo_url}


@router.get("/me")
def get_my_company(
    current_user: User = Depends(RoleChecker("owner", "admin", "manager", "operator", "agent")),
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
        "ai_custom_instructions": company.ai_custom_instructions,
        "logo_url": company.logo_url,
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
    
    if payload.ai_model_tier: company.ai_model_tier = payload.ai_model_tier
    if payload.ai_custom_instructions is not None: company.ai_custom_instructions = payload.ai_custom_instructions
    
    # Only owner can change plan and limits
    if current_user.role == "owner":
        if payload.plan: company.plan = payload.plan
        if payload.max_accounts is not None: company.max_accounts = payload.max_accounts
        if payload.daily_reply_limit is not None: company.daily_reply_limit = payload.daily_reply_limit
        
    db.add(company)
    db.commit()
    return {"status": "success", "company_id": str(company.id)}

@router.delete("/{company_id}")
def delete_company(
    company_id: UUID,
    current_user: User = Depends(RoleChecker("owner")),
    db: Session = Depends(get_db)
) -> dict:
    # Olay: Owner'ın kendi ana şirketini silmesini engelle
    if current_user.company_id == company_id:
        raise HTTPException(status_code=400, detail="Ana şirketinizi silemezsiniz.")

    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # The ondelete="CASCADE" in SQLAlchemy models (e.g. users, instagram_accounts)
    # usually relies on database-level constraints. Deleting the company
    # will wipe all related records from DB.
    db.delete(company)
    db.commit()
    
    return {"status": "success", "message": "Şirket başarıyla silindi"}
