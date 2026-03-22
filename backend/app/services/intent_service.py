from typing import Any

from app.core.config import settings
from app.integrations.openai_client import get_openai_client
from app.integrations.gemini_client import get_gemini_model


INTENT_LABELS = {
    "price_inquiry",
    "location_inquiry",
    "details_request",
    "contact_request",
    "negotiation_attempt",
    "general_interest",
    "spam_irrelevant",
    "complaint",
}


def _heuristic_intent(text: str) -> tuple[str, float]:
    lowered = text.lower()
    if any(k in lowered for k in ["fiyat", "kaç tl", "ne kadar", "son fiyat"]):
        return "price_inquiry", 0.87
    if any(k in lowered for k in ["nerede", "mahalle", "ilce", "ilçe", "konum"]):
        return "location_inquiry", 0.84
    if any(k in lowered for k in ["detay", "kaç oda", "m2", "metrekare", "tapu"]):
        return "details_request", 0.82
    if any(k in lowered for k in ["dm", "numara", "telefon", "iletişim", "arayın"]):
        return "contact_request", 0.9
    if any(k in lowered for k in ["olur mu", "indirim", "son", "pazarlik", "pazarlık"]):
        return "negotiation_attempt", 0.8
    if any(k in lowered for k in ["link bio", "takip et", "coin", "kripto", "bahis"]):
        return "spam_irrelevant", 0.92
    return "general_interest", 0.7

def classify_intent(text: str) -> tuple[str, float, bool, str]:
    heuristic_intent, heuristic_conf = _heuristic_intent(text)

    # Gemini Logic
    if settings.ai_provider == "gemini" and settings.gemini_api_key:
        try:
            model = get_gemini_model()
            prompt = (
                "Sen bir emlak yorum siniflandirma motorusun.\n"
                "Mesaj: " + text + "\n\n"
                "Sadece su intentlerden birini sec: price_inquiry, location_inquiry, details_request, contact_request, negotiation_attempt, general_interest, spam_irrelevant, complaint.\n"
                "JSON formatında cevap ver: {\"intent\": \"...\", \"confidence\": 0.9, \"is_sensitive\": false, \"reason\": \"...\"}"
            )
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            import json
            data = json.loads(response.text)
            intent = str(data.get("intent", heuristic_intent))
            confidence = float(data.get("confidence", heuristic_conf))
            is_sensitive = bool(data.get("is_sensitive", False))
            reason = str(data.get("reason", "gemini"))
            
            if intent not in INTENT_LABELS:
                return heuristic_intent, heuristic_conf, False, "fallback_invalid_label"
            return intent, max(0.0, min(confidence, 1.0)), is_sensitive, reason
        except Exception as e:
            import logging
            logging.error(f"Gemini Intent Error: {e}", exc_info=True)
            return heuristic_intent, heuristic_conf, False, "fallback_exception_gemini"

    # OpenAI Logic
    if not settings.openai_api_key:
        return heuristic_intent, heuristic_conf, False, "heuristic"

    try:
        client = get_openai_client()
        completion = client.chat.completions.create(
            model=settings.openai_model_intent,
            temperature=0,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Sen bir emlak yorum siniflandirma motorusun. "
                        "Sadece su intentlerden birini sec: "
                        "price_inquiry, location_inquiry, details_request, contact_request, "
                        "negotiation_attempt, general_interest, spam_irrelevant, complaint. "
                        "JSON dondur: {intent, confidence, is_sensitive, reason}."
                    ),
                },
                {"role": "user", "content": text},
            ],
        )
        raw: str = completion.choices[0].message.content or "{}"
        import json

        data: dict[str, Any] = json.loads(raw)
        intent = str(data.get("intent", heuristic_intent))
        confidence = float(data.get("confidence", heuristic_conf))
        is_sensitive = bool(data.get("is_sensitive", False))
        reason = str(data.get("reason", "model"))

        if intent not in INTENT_LABELS:
            return heuristic_intent, heuristic_conf, False, "fallback_invalid_label"

        return intent, max(0.0, min(confidence, 1.0)), is_sensitive, reason
    except Exception:
        return heuristic_intent, heuristic_conf, False, "fallback_exception"
