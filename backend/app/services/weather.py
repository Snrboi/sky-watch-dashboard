"""Current conditions and the short forecast from OpenWeatherMap, in metric units."""

from datetime import UTC, datetime, timedelta
from itertools import pairwise
from typing import TYPE_CHECKING, Any

from app.cache import Cached
from app.errors import UpstreamUnavailableError
from app.services.common import round_coord
from app.services.openweather import OWM_BASE_URL, require_key

if TYPE_CHECKING:
    from app.deps import AppContext

SOURCE = "weather"
TTL_SECONDS = 600
FORECAST_BASE_POINTS = 9
FORECAST_HOURS = 24
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
        system = data.get("sys") or {}
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
            "sunrise_at": _unix_to_utc(system.get("sunrise")),
            "sunset_at": _unix_to_utc(system.get("sunset")),
            "advice": weather_advice(
                condition, float(main["temp"]), str(condition_info["description"]).lower()
            ),
        }
    except (KeyError, IndexError, TypeError, ValueError) as error:
        raise UpstreamUnavailableError(
            f"weather response was missing a field ({error}).", source=SOURCE
        ) from error


def _unix_to_utc(value: Any) -> datetime | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return datetime.fromtimestamp(int(value), tz=UTC)


def weather_advice(condition: str, temp_c: float, description: str) -> str | None:
    """One line of clothing-and-carry advice, or None when nothing stands out."""
    if condition in ("Rain", "Drizzle", "Thunderstorm") or "rain" in description:
        return "Take an umbrella."
    if condition == "Snow" or "snow" in description:
        return "Dress warmly and watch for slippery roads."
    if condition == "Clear" and temp_c >= 27:
        return "Sunscreen and water."
    if temp_c <= 10:
        return "A jacket is a good idea."
    if condition == "Clouds" and temp_c >= 27:
        return "Warm, but the sun is hidden."
    return None


def get_forecast(ctx: "AppContext", lat: float, lon: float) -> Cached[dict[str, Any]]:
    """A 24-hour forecast, interpolated to hourly estimates from the free 3-hour feed."""
    key = require_key(ctx, SOURCE)
    lat, lon = round_coord(lat), round_coord(lon)

    def fetch() -> dict[str, Any]:
        data = ctx.http.get_json(
            SOURCE,
            f"{OWM_BASE_URL}/data/2.5/forecast",
            {"lat": lat, "lon": lon, "appid": key, "units": "metric", "cnt": FORECAST_BASE_POINTS},
        )
        return parse_forecast(data, lat, lon)

    return ctx.cache.get_or_fetch(f"forecast:{lat}:{lon}", TTL_SECONDS, fetch)


def parse_forecast(data: Any, lat: float, lon: float) -> dict[str, Any]:
    try:
        raw_points = data["list"][:FORECAST_BASE_POINTS]
        base_points = []
        for item in raw_points:
            main = item["main"]
            condition_info = item["weather"][0]
            base_points.append(
                {
                    "at": datetime.fromtimestamp(int(item["dt"]), tz=UTC),
                    "temp_c": round(float(main["temp"]), 1),
                    "description": str(condition_info["description"]).capitalize(),
                    "icon": ICON_BY_CONDITION.get(str(condition_info["main"]), "unknown"),
                }
            )
    except (KeyError, IndexError, TypeError, ValueError) as error:
        raise UpstreamUnavailableError(
            f"forecast response was missing a field ({error}).", source=SOURCE
        ) from error
    if not base_points:
        raise UpstreamUnavailableError("forecast response held no entries.", source=SOURCE)
    return {"lat": lat, "lon": lon, "points": _interpolate_hourly(base_points)}


def _interpolate_hourly(base_points: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Fill hourly timestamps between provider samples, linearly estimating temperature."""
    hourly: list[dict[str, Any]] = []
    for start, end in pairwise(base_points):
        interval_hours = int((end["at"] - start["at"]).total_seconds() // 3600)
        if interval_hours < 1:
            continue
        for offset in range(interval_hours):
            if len(hourly) >= FORECAST_HOURS:
                return hourly
            fraction = offset / interval_hours
            hourly.append(
                {
                    "at": start["at"] + timedelta(hours=offset),
                    "temp_c": round(
                        start["temp_c"] + (end["temp_c"] - start["temp_c"]) * fraction,
                        1,
                    ),
                    "description": start["description"],
                    "icon": start["icon"],
                }
            )
    return hourly or base_points[:FORECAST_HOURS]
