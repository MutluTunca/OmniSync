import random

from app.core.config import settings
from app.integrations.openai_client import get_openai_client
from app.integrations.gemini_client import get_gemini_model
import httpx


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
    media_url: str | None = None,
    media_caption: str | None = None,
    company_instructions: str | None = None,
    ai_model: str | None = None,
    is_dm: bool = False,
    conversation_history: list[dict[str, str]] | None = None,
) -> str:
    base = DEFAULT_TEMPLATES.get(intent, DEFAULT_TEMPLATES["general_interest"])
    if intent == "spam_irrelevant":
        return ""

    greeting = f"Merhaba @{username}, " if username else "Merhaba, "
    draft = f"{greeting}{base}"

    if ai_model and ai_model.startswith("gemini"):
        ai_provider = "gemini"
    elif ai_model and ai_model.startswith("gpt"):
        ai_provider = "openai"
    else:
        ai_provider = settings.ai_provider

    # Gemini Logic
    if ai_provider == "gemini" and settings.gemini_api_key:
        try:
            model = get_gemini_model(ai_model)
            avoid_block = "\n".join(f"- {x}" for x in (recent_replies or [])[:5]) or "- yok"
            
            base_prompt = (
                "Sen profesyonel, samimi ve ikna edici bir gayrimenkul danışmanısın. "
                "Kullanıcının mesajına Türkçe, samimi ve güven veren bir yanıt yaz. "
                "Maksimum 240 karakter. "
            )
            
            if is_dm:
                base_prompt += "Bu bir DM (Direkt Mesaj) konuşmasıdır. Yanıtın kısa, öz ve akışı devam ettiren bir yapıda olsun.\n"
            else:
                base_prompt += "Aşağıdaki 'Taslak' (Draft) sadece fikir vermesi içindir, birebir kopyalama!\n"

            if company_instructions:
                base_prompt += f"ÖZEL ŞİRKET TALİMATLARI (BUNLARA KESİNLİKLE UY): {company_instructions}\n\n"

            history_str = ""
            if conversation_history:
                history_str = "Sohbet Geçmişi:\n" + "\n".join([f"{m['role']}: {m['content']}" for m in conversation_history])

            prompt_parts = [
                base_prompt +
                f"{history_str}\n"
                f"Kullanıcı Sondaki Mesajı/Yorumu: {comment_text}\n"
                f"Niyet (Intent): {intent}\n"
                f"Örnek Taslak: {draft}\n"
                f"İlan/Görsel Açıklaması: {media_caption or 'yok'}\n"
                "Kural: Eğer kullanıcı bir görsel gönderdiyse, görseli analiz et ve içeriğine göre (ev mi, arsa mı, detay mı?) profesyonelce yorum yap.\n"
                "Yanıtın sonunda akışı tamamlayan veya DM'deysen bir eylem çağrısı yap."
            ]
            
            if media_url:
                try:
                    with httpx.Client() as client:
                        resp = client.get(media_url)
                        if resp.status_code == 200:
                            prompt_parts.append({
                                "mime_type": "image/jpeg",
                                "data": resp.content
                            })
                except Exception:
                    pass

            response = model.generate_content(prompt_parts)
            text = (response.text or draft).strip()
            return text[:240]
        except Exception as e:
            import logging
            logging.error(f"Gemini Reply Error: {e}", exc_info=True)
            return _fallback_reply(intent=intent, username=username)

    # OpenAI Logic
    if not settings.openai_api_key:
        return _fallback_reply(intent=intent, username=username)

    try:
        client = get_openai_client()
        
        system_prompt = (
            "Sen uzman bir gayrimenkul danışmanısın. Türkçe, samimi ve profesyonel yanıt yaz. "
            "Maksimum 240 karakter. Ayni kalibi tekrar etme."
        )
        if company_instructions:
            system_prompt += f"\nOZEL SIRKET TALIMATLARI (KESINLIKLE UY): {company_instructions}"
        
        if is_dm:
            system_prompt += "\nBu bir DM konusmasidir. Diyalogu devam ettir, yardimci ol ve guven ver."

        messages = [{"role": "system", "content": system_prompt}]
        
        if conversation_history:
            for m in conversation_history:
                messages.append({"role": m["role"], "content": m["content"]})

        user_content = [
            {
                "type": "text", 
                "text": (
                    f"Kullanici Mesaji: {comment_text}\n"
                    f"Detected Intent: {intent}\n"
                    f"Sample Draft: {draft}\n"
                    "Eger bir gorsel (image) gorebiliyorsan, emlak detaylarina gore yorumla."
                )
            }
        ]
        
        if media_url:
            user_content.append({
                "type": "image_url",
                "image_url": {"url": media_url}
            })
        
        messages.append({"role": "user", "content": user_content})

        completion = client.chat.completions.create(
            model=ai_model or settings.openai_model_reply,
            temperature=0.8,
            messages=messages,
            max_tokens=150,
        )
        text = (completion.choices[0].message.content or draft).strip()
        return text[:240]
    except Exception as e:
        import logging
        logging.error(f"OpenAI Reply Error: {e}")
        return _fallback_reply(intent=intent, username=username)
