"""Upcoming visible ISS passes from Pollux Labs. Ratings use the peak elevation."""

import logging
from datetime import datetime
from typing import TYPE_CHECKING, Any

from app.cache import Cached
from app.errors import UpstreamUnavailableError
from app.services.common import optional_float, optional_int, parse_utc, round_coord

if TYPE_CHECKING:
    from app.deps import AppContext

logger = logging.getLogger(__name__)
SOURCE = "passes"
TTL_SECONDS = 6 * 60 * 60
PASSES_URL = "https://iss-api.polluxlabs.io/iss-pass"
EXCELLENT_MIN_DEG = 45.0
GOOD_MIN_DEG = 20.0
RATING_LABELS = {"excellent": "Excellent", "good": "Good", "low": "Low"}


def rate_pass(max_elevation_deg: float) -> str:
    if max_elevation_deg >= EXCELLENT_MIN_DEG:
        return "excellent"
    if max_elevation_deg >= GOOD_MIN_DEG:
        return "good"
    return "low"


def get_passes(
    ctx: "AppContext", lat: float, lon: float, *, now: datetime, limit: int
) -> Cached[dict[str, Any]]:
    lat, lon = round_coord(lat), round_coord(lon)
    cached = ctx.cache.get_or_fetch(
        f"passes:{lat}:{lon}", TTL_SECONDS, lambda: _fetch(ctx, lat, lon)
    )
    # The cache can hold a pass that has already happened. Drop those at serve time.
    upcoming = [item for item in cached.value["passes"] if _ends_at(item) > now][:limit]
    return Cached(
        value={**cached.value, "passes": upcoming},
        fetched_at=cached.fetched_at,
        stale=cached.stale,
    )


def _fetch(ctx: "AppContext", lat: float, lon: float) -> dict[str, Any]:
    data = ctx.http.get_json(SOURCE, PASSES_URL, {"lat": lat, "lon": lon, "visible_only": "true"})
    if not isinstance(data, dict) or not isinstance(data.get("passes"), list):
        raise UpstreamUnavailableError("Pollux Labs sent an unexpected response.", source=SOURCE)
    passes: list[dict[str, Any]] = []
    for item in data["passes"]:
        try:
            passes.append(parse_pass(item))
        except (KeyError, TypeError, ValueError, AttributeError) as error:
            logger.warning("Skipping a malformed ISS pass: %s", error)
    stale_flag = data.get("tle_stale")
    return {
        "lat": lat,
        "lon": lon,
        "passes": passes,
        "tle_epoch": parse_utc(data.get("tle_epoch")),
        "tle_age_hours": optional_float(data.get("tle_age_hours")),
        "tle_stale": stale_flag if isinstance(stale_flag, bool) else None,
    }


def parse_pass(item: dict[str, Any]) -> dict[str, Any]:
    rise = item["rise"]
    culmination = item["culmination"]
    set_part = item.get("set") or {}
    max_elevation = float(culmination["elevation_deg"])
    rating = rate_pass(max_elevation)
    rise_at = parse_utc(rise["time"])
    if rise_at is None:
        raise ValueError("pass has no rise time")
    return {
        "rise_at": rise_at,
        "rise_compass": str(rise.get("compass") or ""),
        "rise_azimuth_deg": optional_float(rise.get("azimuth_deg")),
        "culmination_at": parse_utc(culmination.get("time")),
        "max_elevation_deg": max_elevation,
        "set_at": parse_utc(set_part.get("time")),
        "visible_start": parse_utc(item.get("visible_start")),
        "visible_end": parse_utc(item.get("visible_end")),
        # visible_duration_sec is the time actually visible. duration_sec includes time below
        # the horizon or in twilight, so it is never used here.
        "visible_duration_sec": optional_int(item.get("visible_duration_sec")),
        "rating": rating,
        "rating_label": RATING_LABELS[rating],
    }


def _ends_at(item: dict[str, Any]) -> datetime:
    return item["visible_end"] or item["set_at"] or item["rise_at"]
