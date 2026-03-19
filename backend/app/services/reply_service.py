import random

from app.core.config import settings
from app.integrations.openai_client import get_openai_client


DEFAULT_TEMPLATES = {
    "price_inquiry": "Merhaba, ilanimiza gosterdiginiz ilgi icin tesekkurler. Fiyat bilgisi ve odeme detaylarini DM uzerinden hemen paylasabilirim.",
    "location_inquiry": "Merhaba, ilanimiz konum olarak oldukca avantajli bir bolgede yer aliyor. Tam konum bilgisini DM uzerinden iletebilirim.",
    "details_request": "Merhaba, ilanin teknik detaylarini memnuniyetle paylasirim. Oda plani, m2 ve diger bilgileri DM'den iletebilirim.",
    "contact_request": "Merhaba, iletisim icin tesekkurler. Telefon numaranizi DM'den birakirsaniz sizi en kisa surede arayabiliriz.",
    "negotiation_attempt": "Merhaba, ilginiz icin tesekkur ederiz. Guncel fiyat ve alternatifleri DM uzerinden degerlendirebiliriz.",
    "general_interest": "Merhaba, ilginiz icin cok tesekkurler. Size uygun secenekleri DM uzerinden paylasmaktan memnuniyet duyariz.",
    "spam_irrelevant": "",
}

FALLBACK_VARIANTS = {
    "price_inquiry": [
        "fiyat bilgisi ve odeme seceneklerini DM'den paylasabilirim",
        "guncel fiyat ve odeme kosullarini DM uzerinden iletebilirim",
        "detayli fiyat bilgisini DM'den hemen aktarabilirim",
    ],
    "location_inquiry": [
        "konum detayini DM uzerinden net olarak iletebilirim",
        "mahalle ve ulasim bilgisini DM'de paylasabilirim",
        "tam konum bilgisini DM tarafinda ileteyim",
    ],
    "details_request": [
        "oda plani, m2 ve teknik detaylari DM'de paylasabilirim",
        "ilanin tum teknik detaylarini DM'den iletebilirim",
        "detay dosyasini DM uzerinden gonderebilirim",
    ],
    "contact_request": [
        "telefon bilginizi DM'den birakirsaniz hemen donus yapalim",
        "iletisim numaranizi DM'de paylasirsaniz sizi arayalim",
        "DM'den iletisim bilginizi iletirseniz kisa surede ulasalim",
    ],
    "negotiation_attempt": [
        "fiyat alternatiflerini DM uzerinden birlikte degerlendirebiliriz",
        "guncel kosullari DM'de netlestirebiliriz",
        "uygun secenekleri DM tarafinda konusalim",
    ],
    "general_interest": [
        "size uygun secenekleri DM uzerinden paylasmaktan memnun oluruz",
        "detaylari DM tarafinda iletebiliriz",
        "DM'de kisa bir bilgilendirme yapabilirim",
    ],
}

CTA_VARIANTS = [
    "Uygunsa DM'den yazin.",
    "DM'den iletisime gecelim.",
    "Isterseniz DM'de detaylandiralim.",
]


def _fallback_reply(intent: str, username: str | None) -> str:
    greeting = f"Merhaba @{username}, " if username else "Merhaba, "
    body = random.choice(FALLBACK_VARIANTS.get(intent, FALLBACK_VARIANTS["general_interest"]))
    cta = random.choice(CTA_VARIANTS)
    return f"{greeting}ilginiz icin tesekkurler, {body}. {cta}"[:240]


def generate_reply(
    comment_text: str,
    intent: str,
    username: str | None = None,
    recent_replies: list[str] | None = None,
) -> str:
    base = DEFAULT_TEMPLATES.get(intent, DEFAULT_TEMPLATES["general_interest"])
    if intent == "spam_irrelevant":
        return ""

    greeting = f"Merhaba @{username}, " if username else "Merhaba, "
    draft = f"{greeting}{base}"

    if not settings.openai_api_key:
        return _fallback_reply(intent=intent, username=username)

    try:
        client = get_openai_client()
        avoid_block = "\n".join(f"- {x}" for x in (recent_replies or [])[:5]) or "- yok"
        completion = client.chat.completions.create(
            model=settings.openai_model_reply,
            temperature=0.8,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Turkce, samimi ve profesyonel tek bir emlak yaniti yaz. "
                        "Maksimum 240 karakter. Spam gibi olmasin. "
                        "Ayni kalibi tekrar etme, her cevapta farkli ifade kullan."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Yorum: {comment_text}\n"
                        f"Intent: {intent}\n"
                        f"Taslak: {draft}\n"
                        f"Tekrar etme listesi:\n{avoid_block}\n"
                        "Yanitta DM'e yonlendiren kisa bir cagirida bulun."
                    ),
                },
            ],
        )
        text = (completion.choices[0].message.content or draft).strip()
        return text[:240]
    except Exception:
        return _fallback_reply(intent=intent, username=username)
