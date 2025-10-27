"""Application configuration settings."""
from __future__ import annotations

from functools import lru_cache
from typing import List, Optional

try:
    from pydantic_settings import BaseSettings
except ImportError:  # pragma: no cover - fallback for environments without pydantic-settings
    from pydantic import BaseSettings  # type: ignore


class AppSettings(BaseSettings):
    """Strongly typed application settings using pydantic."""

    # Database configuration
    database_url: str = "mysql+pymysql://root:@localhost:3306/pfdk_ai"
    echo_sql: bool = False
    pool_size: int = 20
    pool_recycle: int = 1800

    # Redis & cache configuration
    redis_url: str = "redis://localhost:6379/0"
    cache_enabled: bool = True

    # JWT & security
    secret_key: str = "change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    bcrypt_rounds: int = 12
    max_login_attempts: int = 5
    lockout_duration_minutes: int = 15

    # Web & CORS
    backend_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3000"
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
    ]

    # Mail
    smtp_server: Optional[str] = None
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: str = "noreply@brandhub.ai"

    # Integrations
    google_ai_api_key: Optional[str] = None
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None

    # Environment
    environment: str = "development"
    debug: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> AppSettings:
    """Return cached settings instance."""

    return AppSettings()


settings = get_settings()
