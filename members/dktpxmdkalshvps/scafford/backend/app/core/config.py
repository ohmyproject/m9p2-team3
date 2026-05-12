from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_host: str = "127.0.0.1"
    api_port: int = 8000

    # Comma-separated origins. Example:
    # FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,https://meomum.kr
    frontend_origins: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173,"
        "http://localhost:3000,"
        "http://127.0.0.1:3000"
    )

    # Development regex: localhost / 127.0.0.1 / private LAN on any port.
    # Set to an empty string in production if you want to allow only FRONTEND_ORIGINS.
    frontend_origin_regex: str = (
        r"https?://("
        r"localhost|"
        r"127\.0\.0\.1|"
        r"0\.0\.0\.0|"
        r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
        r"192\.168\.\d{1,3}\.\d{1,3}|"
        r"172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}"
        r")(:\d+)?"
    )

    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_role_key: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> List[str]:
        origins = [
            origin.strip()
            for origin in self.frontend_origins.split(",")
            if origin.strip()
        ]
        return origins or ["http://localhost:5173"]

    @property
    def cors_origin_regex(self) -> str | None:
        value = self.frontend_origin_regex.strip()
        return value or None

    @property
    def supabase_enabled(self) -> bool:
        return bool(self.supabase_url and self.supabase_anon_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
