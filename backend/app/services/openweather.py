"""OpenWeatherMap: the shared base URL and key check for weather, air quality, and geocoding."""

from typing import TYPE_CHECKING

from app.errors import NotConfiguredError

if TYPE_CHECKING:
    from app.deps import AppContext

OWM_BASE_URL = "https://api.openweathermap.org"


def require_key(ctx: "AppContext", source: str) -> str:
    """Return the OpenWeatherMap key, or fail with NOT_CONFIGURED before any network call."""
    key = ctx.settings.openweather_api_key
    if not key:
        raise NotConfiguredError(
            "The OpenWeatherMap key is not set. Add OPENWEATHER_API_KEY to backend/.env.",
            source=source,
        )
    return key
