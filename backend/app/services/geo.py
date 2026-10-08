"""Pure geography: great-circle distance, and rough region names.

Region names are approximate by design. A land test (global-land-mask) decides whether a
point is over land. Land names come from coarse boxes, and ocean names from coarse rules.
Every label is phrased "Roughly over ...". Boxes are checked in order; the first match wins.
"""

import math

from app.services.land import is_land

EARTH_RADIUS_KM = 6371.0

# name, min_lat, max_lat, min_lon, max_lon
LAND_BOXES: tuple[tuple[str, float, float, float, float], ...] = (
    ("Antarctica", -90.0, -60.0, -180.0, 180.0),
    ("Greenland", 59.0, 84.0, -74.0, -30.0),
    ("South America", -56.0, 13.0, -82.0, -34.0),
    ("Europe", 36.0, 72.0, -25.0, 45.0),
    ("Asia", 12.0, 42.0, 36.0, 60.0),  # Arabian Peninsula, checked before Africa
    ("Africa", -36.0, 36.0, -18.0, 52.0),
    ("North America", 7.0, 84.0, -170.0, -50.0),
    ("Australia", -44.0, -10.0, 113.0, 154.0),
    ("Asia", -11.0, 78.0, 26.0, 180.0),
)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> int:
    """Great-circle distance between two points in kilometres, rounded to a whole number."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(EARTH_RADIUS_KM * c)


def describe_region(lat: float, lon: float) -> str:
    """Return a rough label such as "Roughly over Africa" or "Roughly over the Pacific Ocean"."""
    name = _land_name(lat, lon) if is_land(lat, lon) else _ocean_name(lat, lon)
    return f"Roughly over {name}"


def _land_name(lat: float, lon: float) -> str:
    for name, min_lat, max_lat, min_lon, max_lon in LAND_BOXES:
        if min_lat <= lat <= max_lat and min_lon <= lon <= max_lon:
            return name
    return "land"


def _ocean_name(lat: float, lon: float) -> str:
    if lat < -60:
        return "the Southern Ocean"
    if lat > 66.5:
        return "the Arctic Ocean"
    if -98 <= lon <= -80 and 18 <= lat <= 31:  # Gulf of Mexico
        return "the Gulf of Mexico"
    if -88 <= lon <= -60 and 9 <= lat <= 22:  # Caribbean
        return "the Caribbean Sea"
    if -70 <= lon <= 20:
        return "the Atlantic Ocean"
    if 20 < lon < 120 and lat < 30:
        return "the Indian Ocean"
    if 20 <= lon < 120:
        return "the seas near Eurasia"
    return "the Pacific Ocean"
