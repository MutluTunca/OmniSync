import hmac
import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query, Request, Header
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.webhook_event import WebhookEvent
from app.workers.celery_app import celery_app


router = APIRouter()


def verify_signature(payload: bytes, signature: str) -> bool:
    if not signature:
        return False
    # Signature comes as 'sha256=...'
    if signature.startswith("sha256="):
        signature = signature[7:]
    
    expected_signature = hmac.new(
        key=settings.meta_app_secret.encode("utf-8"),
        msg=payload,
        digestmod=hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(expected_signature, signature)


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
async def receive_webhook(
    request: Request,
    x_hub_signature_256: str = Header(None, alias="X-Hub-Signature-256")
) -> dict[str, str]:
    body = await request.body()
    
    # Verify signature if app_secret is set (allow skipping in dev if secret missing, but ideally not)
    if settings.meta_app_secret:
        if not verify_signature(body, x_hub_signature_256):
            raise HTTPException(status_code=403, detail="Invalid signature")
    
    try:
        payload = await request.json()
        # Log basic info for debugging
        print(f"WEBHOOK RECEIVED: Object={payload.get('object')} EntryCount={len(payload.get('entry', []))}")
        if payload.get("entry"):
            for entry in payload["entry"]:
                if "messaging" in entry:
                    print(f" -> Messaging detected for page: {entry.get('id')}")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

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
