import google.generativeai as genai
from app.core.config import settings

def configure_gemini():
    if settings.gemini_api_key:
        genai.configure(api_key=settings.gemini_api_key)

def get_gemini_model(model_name: str | None = None):
    configure_gemini()
    name = model_name or settings.gemini_model
    return genai.GenerativeModel(name)
