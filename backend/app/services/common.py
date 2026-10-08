"""Small parsing helpers shared by the upstream adapters."""

from datetime import UTC, datetime
from typing import Any


def round_coord(value: float) -> float:
    """Round a coordinate to 2 decimal places (about 1 km), for cache keys and upstream calls."""
    return round(float(value), 2)


def optional_float(value: Any) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def optional_int(value: Any) -> int | None:
    number = optional_float(value)
    return None if number is None else round(number)


def parse_utc(value: Any) -> datetime | None:
    """Parse an ISO 8601 string (with Z or an offset) into an aware UTC datetime."""
    if not isinstance(value, str) or not value:
        return None
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed.astimezone(UTC) if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def utc_now() -> datetime:
    return datetime.now(UTC)
