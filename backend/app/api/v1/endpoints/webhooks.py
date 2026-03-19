from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.webhook_event import WebhookEvent
from app.workers.celery_app import celery_app


router = APIRouter()


@router.get("/meta")
def verify_webhook(
    hub_mode: str = Query(..., alias="hub.mode"),
    hub_challenge: str = Query(..., alias="hub.challenge"),
    hub_verify_token: str = Query(..., alias="hub.verify_token"),
) -> PlainTextResponse:
    if hub_mode == "subscribe" and hub_verify_token == settings.meta_verify_token:
        return PlainTextResponse(content=hub_challenge)
    raise HTTPException(status_code=403, detail="Webhook verification failed")


@router.post("/meta")
async def receive_webhook(request: Request) -> dict[str, str]:
    payload = await request.json()

    db: Session = SessionLocal()
    try:
        event = WebhookEvent(
            provider="meta",
            event_type=payload.get("object", "unknown"),
            payload=payload,
            created_at=datetime.now(timezone.utc),
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        celery_app.send_task("app.workers.tasks.process_webhook_event", args=[str(event.id)])
    finally:
        db.close()

    return {"status": "accepted"}
