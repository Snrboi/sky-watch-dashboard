"""Live ISS position: wheretheiss.at first, Open Notify as fallback, plus distance and region."""

import logging
from datetime import UTC, datetime, timedelta
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
TRACK_TTL_SECONDS = 5
ASTROS_TTL_SECONDS = 60 * 60
WHERETHEISS_URL = "https://api.wheretheiss.at/v1/satellites/25544"
WHERETHEISS_POSITIONS_URL = "https://api.wheretheiss.at/v1/satellites/25544/positions"
OPEN_NOTIFY_URL = "http://api.open-notify.org/iss-now.json"
OPEN_NOTIFY_ASTROS_URL = "http://api.open-notify.org/astros.json"
# A track spans this many minutes into the past and the future.
TRACK_MINUTES = 45
# The positions endpoint answers at most 45 timestamps per request.
MAX_TRACK_POINTS = 45


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
            # Where the sun is directly overhead. The map shades the night side
            # with these, so a pass can be judged by daylight as well.
            "solar_lat": optional_float(data.get("solar_lat")),
            "solar_lon": optional_float(data.get("solar_lon")),
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
            "solar_lat": None,
            "solar_lon": None,
            "observed_at": datetime.fromtimestamp(int(data["timestamp"]), tz=UTC),
            "source": "open-notify",
        }
    except (AttributeError, KeyError, TypeError, ValueError) as error:
        raise UpstreamUnavailableError(
            "Open Notify sent an unexpected response.", source=SOURCE
        ) from error


def get_track(
    ctx: "AppContext", minutes: int = TRACK_MINUTES, *, now: datetime | None = None
) -> Cached[dict[str, Any]]:
    """Where the station has been, and where it is going, in one request.

    The primary source answers with a position for any list of timestamps, so the
    track is one call: the past and the future, one point per minute.
    """
    moment = now or datetime.now(UTC)
    # The endpoint caps the list, so a wide window is sampled evenly
    # instead of failing. The default window fits exactly.
    count = min(2 * minutes + 1, MAX_TRACK_POINTS)
    spacing = (2 * minutes) / (count - 1)
    stamps = [
        int((moment + timedelta(minutes=-minutes + index * spacing)).timestamp())
        for index in range(count)
    ]
    key = f"iss:track:{minutes}:{moment.strftime('%Y%m%d%H%M')}"

    def fetch() -> dict[str, Any]:
        data = ctx.http.get_json(
            SOURCE,
            WHERETHEISS_POSITIONS_URL,
            {"timestamps": ",".join(str(stamp) for stamp in stamps)},
        )
        return parse_track(data)

    return ctx.cache.get_or_fetch(key, TRACK_TTL_SECONDS, fetch)


def parse_track(data: Any) -> dict[str, Any]:
    if not isinstance(data, list):
        raise UpstreamUnavailableError("the track response was not a list.", source=SOURCE)
    points: list[dict[str, Any]] = []
    for item in data:
        try:
            points.append(
                {
                    "lat": float(item["latitude"]),
                    "lon": float(item["longitude"]),
                    "at": datetime.fromtimestamp(int(item["timestamp"]), tz=UTC),
                }
            )
        except (KeyError, TypeError, ValueError) as error:
            raise UpstreamUnavailableError(
                "the track response held a bad point.", source=SOURCE
            ) from error
    if not points:
        raise UpstreamUnavailableError("the track response held no points.", source=SOURCE)
    return {"points": points}


def get_astros(ctx: "AppContext") -> Cached[dict[str, Any]]:
    """Who is in space right now. No key, and it changes slowly, so cache for an hour."""

    def fetch() -> dict[str, Any]:
        data = ctx.http.get_json(SOURCE, OPEN_NOTIFY_ASTROS_URL)
        return parse_astros(data)

    return ctx.cache.get_or_fetch("iss:astros", ASTROS_TTL_SECONDS, fetch)


def parse_astros(data: Any) -> dict[str, Any]:
    try:
        if data.get("message") != "success":
            raise ValueError("message is not success")
        people = [
            {"name": str(person["name"]), "craft": str(person["craft"])}
            for person in data["people"]
        ]
        count = int(data["number"])
    except (AttributeError, KeyError, TypeError, ValueError) as error:
        raise UpstreamUnavailableError(
            "Open Notify sent an unexpected roster.", source=SOURCE
        ) from error
    return {"count": count, "people": people}
