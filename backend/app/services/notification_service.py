import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class NotificationService:
    @staticmethod
    def send_alert(message: str, company_name: str = "OmniSync"):
        """
        Sends an alert to the configured slack/webhook URL.
        """
        if not settings.slack_webhook_url:
            logger.info("Slack webhook URL not configured, skipping notification.")
            return

        payload = {
            "text": f"🚨 *{company_name} - Kritik Bildirim*\n\n{message}",
            "username": "OmniSync Alert Bot",
            "icon_emoji": ":warning:"
        }

        try:
            response = httpx.post(settings.slack_webhook_url, json=payload, timeout=10)
            response.raise_for_status()
            logger.info("Notification sent successfully.")
        except Exception as e:
            logger.error(f"Failed to send notification: {str(e)}")

def notify_critical_comment(comment_text: str, username: str, intent: str, company_name: str):
    msg = (
        f"*Kritik Yorum Tespit Edildi!*\n"
        f"*Kullanıcı:* @{username}\n"
        f"*Niyet:* {intent}\n"
        f"*Yorum:* {comment_text}\n"
        f"Lütfen paneli kontrol edin."
    )
    NotificationService.send_alert(msg, company_name)
