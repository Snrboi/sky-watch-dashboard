"""Air quality from OpenWeatherMap's air pollution endpoint."""

from typing import TYPE_CHECKING, Any

from app.cache import Cached
from app.errors import UpstreamUnavailableError
from app.services import aqi
from app.services.common import optional_float, round_coord
from app.services.openweather import OWM_BASE_URL, require_key

if TYPE_CHECKING:
    from app.deps import AppContext

SOURCE = "air-quality"
TTL_SECONDS = 1800
POLLUTANT_CODES = ("pm2_5", "pm10", "o3", "no2", "so2", "co", "nh3", "no")


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
    return {
        "lat": lat,
        "lon": lon,
        "aqi": level.value if level else None,
        "label": level.label if level else None,
        "color": level.color if level else None,
        "advice": level.advice if level else None,
        "pollutants": {code: optional_float(components.get(code)) for code in POLLUTANT_CODES},
    }
