import httpx

from app.core.config import settings


class MetaGraphClient:
    def __init__(self) -> None:
        self.base_url = f"https://graph.facebook.com/{settings.meta_graph_version}"

    async def exchange_code_for_token(self, code: str) -> dict:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                f"{self.base_url}/oauth/access_token",
                params={
                    "client_id": settings.meta_app_id,
                    "client_secret": settings.meta_app_secret,
                    "redirect_uri": settings.meta_oauth_redirect_uri,
                    "code": code,
                },
            )
            response.raise_for_status()
            return response.json()

    async def fetch_pages_with_instagram(self, access_token: str) -> dict:
        fields = "id,name,instagram_business_account{id,username}"
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(
                f"{self.base_url}/me/accounts",
                params={
                    "fields": fields,
                    "access_token": access_token,
                },
            )
            response.raise_for_status()
            return response.json()

    def refresh_access_token(self, access_token: str) -> dict:
        response = httpx.get(
            f"{self.base_url}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.meta_app_id,
                "client_secret": settings.meta_app_secret,
                "fb_exchange_token": access_token,
            },
            timeout=20,
        )
        response.raise_for_status()
        return response.json()

    def send_comment_reply(self, comment_id: str, message: str, access_token: str) -> dict:
        response = httpx.post(
            f"{self.base_url}/{comment_id}/replies",
            data={"message": message, "access_token": access_token},
            timeout=20,
        )
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise Exception(f"Meta Graph API Error: {response.text}") from e
        return response.json()

    def fetch_recent_media(self, ig_user_id: str, access_token: str, limit: int = 10) -> dict:
        response = httpx.get(
            f"{self.base_url}/{ig_user_id}/media",
            params={
                "fields": "id,caption,media_type,media_url,timestamp",
                "limit": limit,
                "access_token": access_token,
            },
            timeout=20,
        )
        response.raise_for_status()
        return response.json()

    def fetch_media_comments(self, media_id: str, access_token: str, limit: int = 50) -> dict:
        response = httpx.get(
            f"{self.base_url}/{media_id}/comments",
            params={
                "fields": "id,text,timestamp,from{id,username}",
                "limit": limit,
                "access_token": access_token,
            },
            timeout=20,
        )
        response.raise_for_status()
        return response.json()

    def fetch_media_details(self, media_id: str, access_token: str) -> dict:
        response = httpx.get(
            f"{self.base_url}/{media_id}",
            params={
                "fields": "id,caption,media_type,media_url,thumbnail_url,timestamp",
                "access_token": access_token,
            },
            timeout=20,
        )
        response.raise_for_status()
        return response.json()
    def send_direct_message(self, recipient_id: str, message_text: str, access_token: str) -> dict:
        """Sends a text message to an Instagram user via DM."""
        response = httpx.post(
            f"{self.base_url}/me/messages",
            params={"access_token": access_token},
            json={
                "recipient": {"id": recipient_id},
                "message": {"text": message_text}
            },
            timeout=20,
        )
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            raise Exception(f"Meta Graph API Messaging Error: {response.text}") from e
        return response.json()

    def fetch_user_profile(self, user_id: str, access_token: str) -> dict:
        """Fetches the Instagram user profile (username, name)."""
        response = httpx.get(
            f"{self.base_url}/{user_id}",
            params={
                "fields": "username,name,profile_pic",
                "access_token": access_token
            },
            timeout=20,
        )
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            # Fallback for when profile fetching is restricted
            return {"id": user_id, "username": None, "name": "Instagram User"}
        return response.json()
