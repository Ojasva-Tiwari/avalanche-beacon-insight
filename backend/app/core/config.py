"""Application configuration management with Pydantic BaseSettings."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Service metadata
    SERVICE_NAME: str = "beacon-insight-backend"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    DATA_MODE: Literal["synthetic", "replay", "real_sensor"] = "synthetic"

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    API_V1_PREFIX: str = "/api/v1"
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
    ]

    # Database settings (Optional in Milestone 1)
    DATABASE_URL: str | None = Field(
        default=None,
        description="Async PostgreSQL / PostGIS connection URL, e.g., postgresql+asyncpg://user:pass@localhost:5432/beacon_insight",
    )
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_ECHO: bool = False

    # NATS JetStream settings (Optional in Milestone 1)
    NATS_URL: str | None = Field(
        default=None,
        description="NATS JetStream connection URL, e.g., nats://localhost:4222",
    )

    # Configuration directory path
    CONFIG_DIR: Path = Path(__file__).resolve().parent.parent.parent / "config"


@lru_cache
def get_settings() -> Settings:
    """Returns cached Settings instance."""
    return Settings()
