from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, 
    comments, 
    company,
    health, 
    instagram, 
    monitoring, 
    users, 
    webhooks,
    audit_logs,
    analytics,
    conversations
)


api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(company.router, prefix="/company", tags=["company"])
api_router.include_router(instagram.router, prefix="/instagram", tags=["instagram"])
api_router.include_router(comments.router, prefix="/comments", tags=["comments"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(monitoring.router, prefix="/monitoring", tags=["monitoring"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(audit_logs.router, prefix="/audit-logs", tags=["audit-logs"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["conversations"])
