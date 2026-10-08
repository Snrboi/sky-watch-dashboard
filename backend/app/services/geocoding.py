"""City search from OpenWeatherMap's direct geocoding endpoint."""

from typing import TYPE_CHECKING, Any

from app.cache import Cached
from app.errors import UpstreamUnavailableError
from app.services.common import round_coord
from app.services.openweather import OWM_BASE_URL, require_key

if TYPE_CHECKING:
    from app.deps import AppContext

SOURCE = "geocoding"
TTL_SECONDS = 86400
MAX_RESULTS = 5


def search_places(ctx: "AppContext", query: str, limit: int) -> Cached[list[dict[str, Any]]]:
    key = require_key(ctx, SOURCE)
    cleaned = " ".join(query.split())
    limit = max(1, min(limit, MAX_RESULTS))

    def fetch() -> list[dict[str, Any]]:
        data = ctx.http.get_json(
            SOURCE,
            f"{OWM_BASE_URL}/geo/1.0/direct",
            {"q": cleaned, "limit": limit, "appid": key},
        )
        return parse_places(data)[:limit]

    return ctx.cache.get_or_fetch(f"geocode:{limit}:{cleaned.casefold()}", TTL_SECONDS, fetch)


def parse_places(data: Any) -> list[dict[str, Any]]:
    if not isinstance(data, list):
        raise UpstreamUnavailableError("geocoding response was not a list.", source=SOURCE)
    places: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str, float, float]] = set()
    for item in data:
        try:
            name = str(item["name"]).strip()
            lat = float(item["lat"])
            lon = float(item["lon"])
            country = str(item.get("country") or "").strip()
        except (KeyError, TypeError, ValueError):
            continue
        if not name or not -90 <= lat <= 90 or not -180 <= lon <= 180:
            continue
        state = str(item.get("state") or "").strip() or None
        dedupe_key = (
            name.casefold(),
            (state or "").casefold(),
            country.casefold(),
            round_coord(lat),
            round_coord(lon),
        )
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        places.append({"name": name, "state": state, "country": country, "lat": lat, "lon": lon})
    return places
