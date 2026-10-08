"""Lookup history: record a place (once per 30 minutes per browser), list it, and summarise it."""

import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING, Any

from app.errors import NotConfiguredError, UpstreamUnavailableError
from app.services import air_quality, iss_passes, weather
from app.services.common import round_coord
from app.services.stats import compute_stats, parse_recorded

if TYPE_CHECKING:
    from app.deps import AppContext

logger = logging.getLogger(__name__)
THROTTLE = timedelta(minutes=30)
_EPOCH = datetime(1970, 1, 1, tzinfo=UTC)


@dataclass(frozen=True)
class LookupOutcome:
    recorded: bool
    entry: dict[str, Any]
    throttled_until: datetime | None


def record_lookup(
    ctx: "AppContext", client_id: str, place: dict[str, Any], *, now: datetime
) -> LookupOutcome:
    """Save a lookup. Readings come from the same cached services the pages use."""
    place_key = _place_key(place["lat"], place["lon"])
    with ctx.lookup_lock:
        earlier = [
            record
            for record in ctx.history.list_for_client(client_id)
            if _place_key_of(record) == place_key and parse_recorded(record) is not None
        ]
        if earlier:
            latest = max(earlier, key=lambda record: parse_recorded(record) or now)
            last_at = parse_recorded(latest)
            if last_at is not None and now - last_at < THROTTLE:
                return LookupOutcome(
                    recorded=False, entry=latest, throttled_until=last_at + THROTTLE
                )
        temp_c, aqi, next_pass_at = _readings(ctx, place, now)
        entry = {
            "id": uuid.uuid4().hex,
            "client_id": client_id,
            "recorded_at": now.isoformat(),
            "city": place["city"],
            "state": place.get("state") or None,
            "country": place.get("country") or "",
            "lat": float(place["lat"]),
            "lon": float(place["lon"]),
            "temp_c": temp_c,
            "aqi": aqi,
            "next_pass_at": next_pass_at.isoformat() if next_pass_at else None,
        }
        ctx.history.add(entry)
    return LookupOutcome(recorded=True, entry=entry, throttled_until=None)


def list_lookups(
    ctx: "AppContext", client_id: str, *, city: str | None, limit: int
) -> list[dict[str, Any]]:
    records = [
        record
        for record in ctx.history.list_for_client(client_id)
        if parse_recorded(record) is not None
    ]
    wanted = (city or "").strip().casefold()
    if wanted:
        records = [record for record in records if str(record.get("city", "")).casefold() == wanted]
    records.sort(key=lambda record: parse_recorded(record) or _EPOCH, reverse=True)
    return records[:limit]


def lookup_stats(ctx: "AppContext", client_id: str) -> dict[str, Any]:
    return compute_stats(ctx.history.list_for_client(client_id))


def _readings(
    ctx: "AppContext", place: dict[str, Any], now: datetime
) -> tuple[float | None, int | None, datetime | None]:
    lat, lon = place["lat"], place["lon"]
    temp_c: float | None = None
    aqi: int | None = None
    next_pass_at: datetime | None = None
    try:
        temp_c = weather.get_weather(ctx, lat, lon).value["temp_c"]
    except (NotConfiguredError, UpstreamUnavailableError) as error:
        logger.info("Temperature not saved with the lookup: %s", error.message)
    try:
        aqi = air_quality.get_air_quality(ctx, lat, lon).value["aqi"]
    except (NotConfiguredError, UpstreamUnavailableError) as error:
        logger.info("AQI not saved with the lookup: %s", error.message)
    try:
        passes = iss_passes.get_passes(ctx, lat, lon, now=now, limit=1).value["passes"]
        next_pass_at = passes[0]["rise_at"] if passes else None
    except (NotConfiguredError, UpstreamUnavailableError) as error:
        logger.info("Next pass not saved with the lookup: %s", error.message)
    return temp_c, aqi, next_pass_at


def _place_key(lat: float, lon: float) -> tuple[float, float]:
    return round_coord(lat), round_coord(lon)


def _place_key_of(record: dict[str, Any]) -> tuple[float, float] | None:
    try:
        return _place_key(record["lat"], record["lon"])
    except (KeyError, TypeError, ValueError):
        return None
