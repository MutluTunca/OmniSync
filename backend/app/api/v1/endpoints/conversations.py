from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from uuid import UUID

from app.db.session import SessionLocal
from app.models.conversation import Conversation
from app.models.message import Message
from app.api.v1.endpoints.auth import get_current_user
from app.models.user import User

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/")
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    company_id: Optional[str] = Query(None, alias="X-Company-ID"),
    limit: int = 50,
    offset: int = 0
):
    # If company_id is provided in header/query, filter by it
    # current_user.company_id is the default if not owner
    target_company_id = company_id or str(current_user.company_id)
    
    query = db.query(Conversation).filter(Conversation.company_id == target_company_id)
    query = query.order_by(desc(Conversation.last_message_at))
    
    total = query.count()
    items = query.limit(limit).offset(offset).all()
    
    return {
        "total": total,
        "items": items
    }

@router.get("/{conversation_id}/messages")
def get_conversation_messages(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 50
):
    # Verify conversation belongs to user's company (basic security)
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    if str(conversation.company_id) != str(current_user.company_id) and current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Not authorized")

    messages = db.query(Message).filter(Message.conversation_id == conversation_id)\
        .order_by(desc(Message.created_at))\
        .limit(limit).all()
        
    # Return in chronological order for chat view
    return sorted(messages, key=lambda x: x.created_at)

@router.post("/{conversation_id}/read")
def mark_as_read(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    conversation.unread_count = 0
    db.commit()
    return {"status": "success"}
