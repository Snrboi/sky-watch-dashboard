"""Settings from environment variables, with the repo-root .env and backend/.env as sources.

Nothing here performs I/O beyond reading the optional .env files.
"""

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = BACKEND_DIR.parent
DEFAULT_HISTORY_PATH = BACKEND_DIR / "data" / "history.json"
DEMO_KEY = "DEMO_KEY"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(REPO_DIR / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        validate_by_name=True,
        validate_by_alias=True,
    )

    openweather_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("OPENWEATHER_API_KEY", "OWM_API_KEY"),
        description="OpenWeatherMap key for weather, air quality, and geocoding.",
    )
    nasa_api_key: str = Field(
        default=DEMO_KEY,
        validation_alias="NASA_API_KEY",
        description="NASA API key for APOD. DEMO_KEY is heavily rate limited.",
    )
    history_path: Path = Field(
        default=DEFAULT_HISTORY_PATH,
        validation_alias="HISTORY_PATH",
        description="History JSON file. Relative paths resolve from backend/.",
    )
    cors_origins: str = Field(
        default="",
        validation_alias="CORS_ORIGINS",
        description="Comma-separated origins allowed by CORS. Local development only.",
    )
    log_level: str = Field(default="INFO", validation_alias="LOG_LEVEL")

    @field_validator("openweather_api_key", mode="before")
    @classmethod
    def _blank_key_is_missing(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip().strip('"').strip("'") or None
        return value

    @field_validator("nasa_api_key", mode="before")
    @classmethod
    def _blank_nasa_key_is_demo(cls, value: object) -> object:
        if isinstance(value, str) and value.strip():
            return value.strip().strip('"').strip("'")
        return DEMO_KEY

    @field_validator("history_path", mode="after")
    @classmethod
    def _resolve_history_path(cls, value: Path) -> Path:
        return value if value.is_absolute() else BACKEND_DIR / value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
