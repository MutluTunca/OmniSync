from datetime import datetime, timedelta, timezone
from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy import func, case, desc
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_current_user, get_db, RoleChecker
from app.models.user import User
from app.models.comment import Comment
from app.models.reply import Reply

router = APIRouter()

@router.get("/overview")
def get_overview(
    current_user: User = Depends(RoleChecker("owner", "admin", "manager", "operator", "agent")),
    db: Session = Depends(get_db),
):
    """
    General metrics for the dashboard home/analytics.
    """
    base_query = db.query(Comment).filter(Comment.company_id == current_user.company_id)
    
    total_comments = base_query.count()
    replied_comments = base_query.filter(Comment.status == "replied").count()
    failed_comments = base_query.filter(Comment.status == "failed").count()
    
    sentiment_distribution = (
        db.query(Comment.sentiment, func.count(Comment.id))
        .filter(Comment.company_id == current_user.company_id)
        .group_by(Comment.sentiment)
        .all()
    )
    
    intent_distribution = (
        db.query(Comment.intent, func.count(Comment.id))
        .filter(Comment.company_id == current_user.company_id)
        .group_by(Comment.intent)
        .all()
    )

    return {
        "total_comments": total_comments,
        "replies_sent": replied_comments,
        "replies_failed": failed_comments,
        "automation_rate": (replied_comments / total_comments * 100) if total_comments > 0 else 0,
        "sentiment_stats": {s: c for s, c in sentiment_distribution if s},
        "intent_stats": {i: c for i, c in intent_distribution if i},
    }

@router.get("/trends")
def get_trends(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Time-series data for comment volume.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Simple daily grouping (Postgres specific date_trunc could be better but this is cross-db friendly-ish)
    results = (
        db.query(
            func.date(Comment.received_at).label("day"),
            func.count(Comment.id).label("count")
        )
        .filter(Comment.company_id == current_user.company_id)
        .filter(Comment.received_at >= since)
        .group_by(func.date(Comment.received_at))
        .order_by(func.date(Comment.received_at))
        .all()
    )
    
    return [
        {"date": r.day.isoformat(), "count": r.count}
        for r in results
    ]

@router.get("/sentiment-distribution")
def get_sentiment_distribution(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Sentiment breakdown for pie charts.
    """
    results = (
        db.query(Comment.sentiment, func.count(Comment.id))
        .filter(Comment.company_id == current_user.company_id)
        .group_by(Comment.sentiment)
        .all()
    )
    
    return [
        {"name": s if s else "unknown", "value": c}
        for s, c in results
    ]
