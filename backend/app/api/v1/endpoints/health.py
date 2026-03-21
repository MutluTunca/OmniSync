from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/healthz")
def healthz() -> dict[str, str]:
    model = settings.gemini_model if settings.ai_provider == "gemini" else settings.openai_model_reply
    return {
        "status": "ok",
        "ai_provider": settings.ai_provider,
        "ai_model": model
    }
