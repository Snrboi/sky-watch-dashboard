"""Current conditions from OpenWeatherMap, in metric units."""

from typing import TYPE_CHECKING, Any

from app.cache import Cached
from app.errors import UpstreamUnavailableError
from app.services.common import round_coord
from app.services.openweather import OWM_BASE_URL, require_key

if TYPE_CHECKING:
    from app.deps import AppContext

SOURCE = "weather"
TTL_SECONDS = 600
# OpenWeatherMap's main condition -> icon token. The frontend maps tokens to icons.
ICON_BY_CONDITION = {
    "Clear": "clear",
    "Clouds": "clouds",
    "Rain": "rain",
    "Drizzle": "drizzle",
    "Thunderstorm": "thunderstorm",
    "Snow": "snow",
    "Mist": "fog",
    "Smoke": "fog",
    "Haze": "fog",
    "Fog": "fog",
    "Dust": "dust",
    "Sand": "dust",
    "Ash": "ash",
    "Squall": "wind",
    "Tornado": "tornado",
}


def get_weather(ctx: "AppContext", lat: float, lon: float) -> Cached[dict[str, Any]]:
    key = require_key(ctx, SOURCE)
    lat, lon = round_coord(lat), round_coord(lon)

    def fetch() -> dict[str, Any]:
        data = ctx.http.get_json(
            SOURCE,
            f"{OWM_BASE_URL}/data/2.5/weather",
            {"lat": lat, "lon": lon, "appid": key, "units": "metric"},
        )
        return parse_weather(data, lat, lon)

    return ctx.cache.get_or_fetch(f"weather:{lat}:{lon}", TTL_SECONDS, fetch)


def parse_weather(data: Any, lat: float, lon: float) -> dict[str, Any]:
    try:
        main = data["main"]
        wind = data["wind"]
        condition_info = data["weather"][0]
        condition = str(condition_info["main"])
        return {
            "lat": lat,
            "lon": lon,
            "temp_c": round(float(main["temp"]), 1),
            "feels_like_c": round(float(main["feels_like"]), 1),
            "humidity_pct": int(main["humidity"]),
            "wind_kph": round(float(wind["speed"]) * 3.6, 1),
            "condition": condition,
            "description": str(condition_info["description"]).capitalize(),
            "icon": ICON_BY_CONDITION.get(condition, "unknown"),
        }
    except (KeyError, IndexError, TypeError, ValueError) as error:
        raise UpstreamUnavailableError(
            f"weather response was missing a field ({error}).", source=SOURCE
        ) from error
