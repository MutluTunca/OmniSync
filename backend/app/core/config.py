from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "OmniSync Emlak"
    app_env: str = "development"
    frontend_url: str = "http://localhost:3000"

    database_url: str = "postgresql+psycopg://omnisync:omnisync@postgres:5432/omnisync"

    jwt_secret: str = "change_me"
    jwt_refresh_secret: str = "change_me_refresh"
    jwt_access_expire_min: int = 30
    jwt_refresh_expire_days: int = 30

    celery_broker_url: str = "redis://redis:6379/1"
    celery_result_backend: str = "redis://redis:6379/2"

    meta_app_id: str = ""
    meta_app_secret: str = ""
    meta_verify_token: str = "omnisync_verify_token"
    meta_graph_version: str = "v20.0"
    meta_oauth_redirect_uri: str = "https://emlak.omnisync.life/api/v1/instagram/oauth/callback"

    openai_api_key: str = ""
    openai_model_intent: str = "gpt-4o-mini"
    openai_model_reply: str = "gpt-4o-mini"
    openai_model_extraction: str = "gpt-4o-mini"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-1.5-flash"
    ai_provider: str = "openai"  # "openai" or "gemini"

    manual_approval_default: bool = True
    daily_max_reply_per_account: int = 250
    reply_delay_min_sec: int = 30
    reply_delay_max_sec: int = 120

    polling_enabled: bool = True
    polling_interval_sec: int = 180
    polling_media_limit: int = 10
    polling_comments_limit: int = 50

    token_refresh_interval_sec: int = 3600
    token_refresh_threshold_hours: int = 72
    token_assumed_expiry_days: int = 60
    # Alerting settings
    slack_webhook_url: str | None = None
    alert_check_interval_sec: int = 60
    queue_alert_threshold: int = 20
    webhook_pending_alert_threshold: int = 20
    webhook_oldest_pending_alert_sec: int = 600

    admin_email: str = "owner@omnisync.life"
    admin_password: str = "ChangeMe123!"
    admin_full_name: str = "OmniSync Owner"
    company_name: str = "OmniSync"


settings = Settings()
