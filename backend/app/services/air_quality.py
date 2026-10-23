"""Air quality from OpenWeatherMap's air pollution endpoints."""

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from app.cache import Cached
from app.errors import UpstreamUnavailableError
from app.services import aqi
from app.services.common import optional_float, round_coord, utc_now
from app.services.openweather import OWM_BASE_URL, require_key

if TYPE_CHECKING:
    from app.deps import AppContext

SOURCE = "air-quality"
TTL_SECONDS = 1800
POLLUTANT_CODES = ("pm2_5", "pm10", "o3", "no2", "so2", "co", "nh3", "no")

# WHO 24-hour guideline concentrations, in micrograms per cubic metre.
# NH3 and NO have no WHO 24-hour guideline, so they are never flagged.
WHO_24H_UG_M3 = {
    "pm2_5": 15.0,
    "pm10": 45.0,
    "o3": 100.0,
    "no2": 25.0,
    "so2": 40.0,
    "co": 4000.0,
}
POLLUTANT_LABELS = {
    "pm2_5": "PM2.5",
    "pm10": "PM10",
    "o3": "O3",
    "no2": "NO2",
    "so2": "SO2",
    "co": "CO",
}


def get_air_quality(ctx: "AppContext", lat: float, lon: float) -> Cached[dict[str, Any]]:
    key = require_key(ctx, SOURCE)
    lat, lon = round_coord(lat), round_coord(lon)

    def fetch() -> dict[str, Any]:
        data = ctx.http.get_json(
            SOURCE,
            f"{OWM_BASE_URL}/data/2.5/air_pollution",
            {"lat": lat, "lon": lon, "appid": key},
        )
        return parse_air_quality(data, lat, lon)

    return ctx.cache.get_or_fetch(f"aqi:{lat}:{lon}", TTL_SECONDS, fetch)


def parse_air_quality(data: Any, lat: float, lon: float) -> dict[str, Any]:
    try:
        first = data["list"][0]
        value = int(first["main"]["aqi"])
        components = first.get("components") or {}
    except (KeyError, IndexError, TypeError, ValueError) as error:
        raise UpstreamUnavailableError(
            f"air quality response was missing a field ({error}).", source=SOURCE
        ) from error
    level = aqi.level_for(value)
    pollutants = {code: optional_float(components.get(code)) for code in POLLUTANT_CODES}
    return {
        "lat": lat,
        "lon": lon,
        "aqi": level.value if level else None,
        "label": level.label if level else None,
        "color": level.color if level else None,
        "advice": level.advice if level else None,
        "who_over": who_over(pollutants),
        "pollutants": pollutants,
    }


def who_over(pollutants: dict[str, float | None]) -> list[str]:
    """Pollutant names above the WHO 24-hour guideline, in a fixed order."""
    return [
        POLLUTANT_LABELS[code]
        for code, limit in WHO_24H_UG_M3.items()
        if pollutants.get(code) is not None and pollutants[code] > limit
    ]


def get_air_quality_history(ctx: "AppContext", lat: float, lon: float) -> Cached[dict[str, Any]]:
    """Hourly AQI for the last 24 hours, from the free history endpoint."""
    key = require_key(ctx, SOURCE)
    lat, lon = round_coord(lat), round_coord(lon)

    def fetch() -> dict[str, Any]:
        end = int(utc_now().timestamp())
        data = ctx.http.get_json(
            SOURCE,
            f"{OWM_BASE_URL}/data/2.5/air_pollution/history",
            {
                "lat": lat,
                "lon": lon,
                "start": end - 24 * 60 * 60,
                "end": end,
                "appid": key,
            },
        )
        return parse_air_quality_history(data, lat, lon)

    return ctx.cache.get_or_fetch(f"aqi-history:{lat}:{lon}", TTL_SECONDS, fetch)


def parse_air_quality_history(data: Any, lat: float, lon: float) -> dict[str, Any]:
    try:
        points = [
            {
                "at": datetime.fromtimestamp(int(item["dt"]), tz=UTC),
                "aqi": int(item["main"]["aqi"]),
            }
            for item in data["list"]
        ]
    except (KeyError, IndexError, TypeError, ValueError) as error:
        raise UpstreamUnavailableError(
            f"air quality history was missing a field ({error}).", source=SOURCE
        ) from error
    if not points:
        raise UpstreamUnavailableError("air quality history held no entries.", source=SOURCE)
    return {"lat": lat, "lon": lon, "points": points}
