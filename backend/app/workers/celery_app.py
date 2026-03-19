from celery import Celery
from app.core.config import settings


celery_app = Celery(
    "omnisync_workers",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.workers.tasks"],
)

celery_app.conf.task_routes = {
    "app.workers.tasks.process_webhook_event": {"queue": "webhooks"},
    "app.workers.tasks.poll_instagram_comments": {"queue": "webhooks"},
    "app.workers.tasks.refresh_instagram_tokens": {"queue": "webhooks"},
    "app.workers.tasks.analyze_comment_intent": {"queue": "ai"},
    "app.workers.tasks.generate_comment_reply": {"queue": "ai"},
    "app.workers.tasks.send_reply": {"queue": "outbound"},
}

beat_schedule = {
    "refresh-instagram-tokens": {
        "task": "app.workers.tasks.refresh_instagram_tokens",
        "schedule": settings.token_refresh_interval_sec,
    }
}

if settings.polling_enabled:
    beat_schedule["poll-instagram-comments"] = {
        "task": "app.workers.tasks.poll_instagram_comments",
        "schedule": settings.polling_interval_sec,
    }

# Schedule operational alerts check
beat_schedule["check-operational-alerts"] = {
    "task": "app.workers.tasks.check_operational_alerts",
    "schedule": settings.alert_check_interval_sec,
}

celery_app.conf.beat_schedule = beat_schedule
