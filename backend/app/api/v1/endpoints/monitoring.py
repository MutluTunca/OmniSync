from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from redis import Redis
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.webhook_event import WebhookEvent
from app.workers.celery_app import celery_app


router = APIRouter()


def _queue_backlog() -> dict[str, int | None]:
    queue_names = ["webhooks", "ai", "outbound"]
    result: dict[str, int | None] = {}

    # Prefer direct Redis queue lengths for Redis broker (handles kombu prefixes).
    try:
        redis_client = Redis.from_url(settings.celery_broker_url)
        prefix = (celery_app.conf.broker_transport_options or {}).get("queue_prefix", "celery")
        for name in queue_names:
            # try both raw and prefixed key
            count = redis_client.llen(name)
            if count == 0:
                count = redis_client.llen(f"{prefix}:{name}")
            result[name] = int(count)
        return result
    except Exception:
        pass

    # Fallback: ask broker queue metadata (works in some transports).
    try:
        with celery_app.connection_for_read() as conn:
            for name in queue_names:
                queue = celery_app.amqp.queues[name]
                declared = queue(conn.channel()).queue_declare(passive=True)
                result[name] = int(declared.message_count)
    except Exception:
        for name in queue_names:
            result[name] = None
    return result


@router.get("/celery")
def celery_health() -> dict:
    inspect = celery_app.control.inspect(timeout=1.5)

    try:
        stats = inspect.stats() or {}
    except Exception:
        stats = {}

    try:
        active = inspect.active() or {}
    except Exception:
        active = {}

    try:
        reserved = inspect.reserved() or {}
    except Exception:
        reserved = {}

    try:
        scheduled = inspect.scheduled() or {}
    except Exception:
        scheduled = {}

    workers = sorted(set(stats.keys()) | set(active.keys()) | set(reserved.keys()) | set(scheduled.keys()))

    workers_view = [
        {
            "worker": worker,
            "active": len(active.get(worker, [])),
            "reserved": len(reserved.get(worker, [])),
            "scheduled": len(scheduled.get(worker, [])),
            "pool_max": (stats.get(worker, {}).get("pool") or {}).get("max-concurrency"),
        }
        for worker in workers
    ]

    return {
        "status": "ok" if workers else "degraded",
        "timestamp": datetime.now(timezone.utc),
        "workers_total": len(workers),
        "queue_backlog": _queue_backlog(),
        "workers": workers_view,
    }


@router.get("/webhooks")
def webhook_health(db: Session = Depends(get_db)) -> dict:
    now = datetime.now(timezone.utc)

    total = db.query(func.count(WebhookEvent.id)).scalar() or 0
    pending = db.query(func.count(WebhookEvent.id)).filter(WebhookEvent.processed.is_(False)).scalar() or 0
    processed = db.query(func.count(WebhookEvent.id)).filter(WebhookEvent.processed.is_(True)).scalar() or 0

    last_1h = db.query(func.count(WebhookEvent.id)).filter(WebhookEvent.created_at >= now - timedelta(hours=1)).scalar() or 0

    oldest_pending = (
        db.query(WebhookEvent)
        .filter(WebhookEvent.processed.is_(False))
        .order_by(WebhookEvent.created_at.asc())
        .first()
    )

    oldest_pending_age_sec = None
    if oldest_pending:
        oldest_pending_age_sec = int((now - oldest_pending.created_at).total_seconds())

    status = "ok"
    if pending > 20:
        status = "warning"
    if pending > 100:
        status = "critical"

    return {
        "status": status,
        "timestamp": now,
        "counts": {
            "total": int(total),
            "processed": int(processed),
            "pending": int(pending),
            "received_last_1h": int(last_1h),
        },
        "oldest_pending_age_sec": oldest_pending_age_sec,
    }


@router.post("/alerts-now")
def alerts_now() -> dict[str, str]:
    """
    Manually trigger the operational alerts check task.
    """
    result = celery_app.send_task("app.workers.tasks.check_operational_alerts")
    return {"status": "queued", "task_id": result.id}
