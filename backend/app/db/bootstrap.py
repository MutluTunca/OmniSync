from datetime import datetime, timezone

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.company import Company
from app.models.user import User


def bootstrap_owner() -> None:
    db = SessionLocal()
    try:
        company = db.query(Company).first()
        if not company:
            company = Company(
                name=settings.company_name,
                plan="free",
                status="active",
                timezone="Europe/Istanbul",
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            db.add(company)
            db.commit()
            db.refresh(company)

        user = db.query(User).filter(User.email == settings.admin_email).first()
        if not user:
            db.add(
                User(
                    company_id=company.id,
                    email=settings.admin_email,
                    password_hash=hash_password(settings.admin_password),
                    role="owner",
                    full_name=settings.admin_full_name,
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
            )
            db.commit()
    finally:
        db.close()
