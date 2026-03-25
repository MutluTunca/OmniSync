from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_current_user, RoleChecker
from app.db.session import get_db
from app.models.comment import Comment
from app.models.post import Post
from app.models.reply import Reply
from app.models.user import User
from app.workers.celery_app import celery_app


router = APIRouter()


class GenerateReplyRequest(BaseModel):
    force_regenerate: bool = False


class ApproveReplyRequest(BaseModel):
    final_text: str
    send_now: bool = False


@router.get("")
def list_comments(
    status: str | None = Query(default=None),
    intent: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    active_company_id: UUID = Depends(get_active_company_id),
    db: Session = Depends(get_db),
) -> dict:
    query = (
        db.query(Comment, Reply, Post)
        .join(Post, Post.id == Comment.post_id)
        .outerjoin(Reply, Reply.comment_id == Comment.id)
        .filter(Comment.company_id == active_company_id)
        .order_by(Comment.received_at.desc())
    )
    if status:
        if status in {"draft", "scheduled", "sent", "failed"}:
            query = query.filter(Reply.status == status)
        else:
            query = query.filter(Comment.status == status)
    if intent:
        query = query.filter(Comment.intent == intent)

    rows = query.limit(limit).all()
    return {
        "items": [
            {
                "id": str(comment.id),
                "text": comment.text,
                "commenter_username": comment.commenter_username,
                "intent": comment.intent,
                "intent_confidence": float(comment.intent_confidence) if comment.intent_confidence is not None else None,
                "is_sensitive": comment.is_sensitive,
                "status": comment.status,
                "received_at": comment.received_at,
                "post": {
                    "id": str(post.id),
                    "ig_media_id": post.ig_media_id,
                    "caption_text": post.caption_text,
                    "media_type": post.media_type,
                    "posted_at": post.posted_at,
                },
                "reply": {
                    "id": str(reply.id),
                    "status": reply.status,
                    "draft_text": reply.draft_text,
                    "final_text": reply.final_text,
                    "sent_at": reply.sent_at,
                }
                if reply
                else None,
            }
            for comment, reply, post in rows
        ]
    }


@router.post("/{comment_id}/generate-reply")
def trigger_generate_reply(
    comment_id: str,
    payload: GenerateReplyRequest,
    current_user: User = Depends(RoleChecker("owner", "admin", "manager", "operator")),
    db: Session = Depends(get_db),
) -> dict:
    try:
        cid = UUID(comment_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid comment id") from exc

    comment = db.query(Comment).filter(Comment.id == cid, Comment.company_id == current_user.company_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    existing = db.query(Reply).filter(Reply.comment_id == comment.id).first()
    if existing and not payload.force_regenerate:
        return {
            "status": "already_exists",
            "reply_id": str(existing.id),
            "draft_text": existing.draft_text,
            "final_text": existing.final_text,
        }

    if payload.force_regenerate:
        reply = db.query(Reply).filter(Reply.comment_id == comment.id).first()
        if reply:
            reply.status = "draft"
            reply.updated_at = datetime.now(timezone.utc)
            db.add(reply)
            db.commit()

    celery_app.send_task("app.workers.tasks.generate_comment_reply", args=[str(comment.id)])
    return {"status": "queued"}


@router.post("/{comment_id}/approve-reply")
def approve_reply(
    comment_id: str,
    payload: ApproveReplyRequest,
    current_user: User = Depends(RoleChecker("owner", "admin", "manager", "operator")),
    db: Session = Depends(get_db),
) -> dict:
    try:
        cid = UUID(comment_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid comment id") from exc

    comment = db.query(Comment).filter(Comment.id == cid, Comment.company_id == current_user.company_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    reply = db.query(Reply).filter(Reply.comment_id == comment.id).first()
    if not reply:
        reply = Reply(
            company_id=comment.company_id,
            comment_id=comment.id,
            draft_text=payload.final_text,
            final_text=payload.final_text,
            status="scheduled" if payload.send_now else "draft",
        )
    else:
        reply.final_text = payload.final_text
        reply.status = "scheduled" if payload.send_now else "draft"

    reply.updated_at = datetime.now(timezone.utc)
    comment.status = "pending_approval" if not payload.send_now else "new"
    comment.updated_at = datetime.now(timezone.utc)

    db.add(reply)
    db.add(comment)
    db.commit()
    db.refresh(reply)

    if payload.send_now:
        celery_app.send_task("app.workers.tasks.send_reply", args=[str(reply.id)])

    return {"status": reply.status, "reply_id": str(reply.id)}
