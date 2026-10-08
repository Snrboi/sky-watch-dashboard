"""Live ISS position: wheretheiss.at first, Open Notify as fallback, plus distance and region."""

import logging
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any

from app.cache import Cached
from app.errors import UpstreamUnavailableError
from app.services.common import optional_float
from app.services.geo import describe_region, haversine_km

if TYPE_CHECKING:
    from app.deps import AppContext

logger = logging.getLogger(__name__)
SOURCE = "iss"
TTL_SECONDS = 5
WHERETHEISS_URL = "https://api.wheretheiss.at/v1/satellites/25544"
OPEN_NOTIFY_URL = "http://api.open-notify.org/iss-now.json"


def get_position(ctx: "AppContext") -> Cached[dict[str, Any]]:
    return ctx.cache.get_or_fetch("iss:position", TTL_SECONDS, lambda: _fetch_position(ctx))


def describe_position(
    position: dict[str, Any], lat: float | None, lon: float | None
) -> dict[str, Any]:
    """Add the region label and, when a place is given, the distance to it."""
    distance = None
    if lat is not None and lon is not None:
        distance = haversine_km(lat, lon, position["lat"], position["lon"])
    return {
        **position,
        "region": describe_region(position["lat"], position["lon"]),
        "distance_km": distance,
    }


def _fetch_position(ctx: "AppContext") -> dict[str, Any]:
    try:
        return parse_wheretheiss(ctx.http.get_json(SOURCE, WHERETHEISS_URL))
    except UpstreamUnavailableError as error:
        logger.warning("Primary ISS source failed (%s); trying Open Notify.", error.message)
    try:
        return parse_open_notify(ctx.http.get_json(SOURCE, OPEN_NOTIFY_URL))
    except UpstreamUnavailableError as error:
        raise UpstreamUnavailableError(
            f"{error.message} The backup source also failed.", source=SOURCE
        ) from error


def parse_wheretheiss(data: Any) -> dict[str, Any]:
    try:
        visibility = data.get("visibility")
        return {
            "lat": float(data["latitude"]),
            "lon": float(data["longitude"]),
            "altitude_km": optional_float(data.get("altitude")),
            "velocity_kmh": optional_float(data.get("velocity")),
            # "eclipsed" means Earth's shadow. Any other value means sunlit.
            "sunlit": None if visibility is None else str(visibility) != "eclipsed",
            "observed_at": datetime.fromtimestamp(int(data["timestamp"]), tz=UTC),
            "source": "wheretheiss.at",
        }
    except (AttributeError, KeyError, TypeError, ValueError) as error:
        raise UpstreamUnavailableError(
            "wheretheiss.at sent an unexpected response.", source=SOURCE
        ) from error


def parse_open_notify(data: Any) -> dict[str, Any]:
    try:
        if data.get("message") != "success":
            raise ValueError("message is not success")
        position = data["iss_position"]
        return {
            "lat": float(position["latitude"]),
            "lon": float(position["longitude"]),
            "altitude_km": None,
            "velocity_kmh": None,
            "sunlit": None,
            "observed_at": datetime.fromtimestamp(int(data["timestamp"]), tz=UTC),
            "source": "open-notify",
        }
    except (AttributeError, KeyError, TypeError, ValueError) as error:
        raise UpstreamUnavailableError(
            "Open Notify sent an unexpected response.", source=SOURCE
        ) from error
