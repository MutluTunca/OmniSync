from typing import Any
from uuid import UUID
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.api.v1.dependencies import get_current_user, get_db, RoleChecker, get_active_company_id
from app.models.user import User
from app.models.audit_log import AuditLog

router = APIRouter()


@router.get("/")
def list_logs(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(RoleChecker("owner", "admin", "manager")),
    active_company_id: UUID = Depends(get_active_company_id),
    db: Session = Depends(get_db),
) -> dict:
    """
    Get audit logs for the current company.
    """
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.company_id == active_company_id)
        .order_by(desc(AuditLog.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )
    
    return {
        "items": [
            {
                "id": str(log.id),
                "event_type": log.event_type,
                "description": log.description,
                "payload": log.payload,
                "created_at": log.created_at.isoformat(),
                "user_id": str(log.user_id) if log.user_id else None,
            }
            for log in logs
        ]
    }
