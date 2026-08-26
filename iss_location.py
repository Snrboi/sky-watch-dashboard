"""
iss_location.py - Role 4: The ISS Live Tracker
------------------------------------------------
Part of the SkyWatch Dashboard group project.

Fetches the International Space Station's current real-time position
from the Open Notify API (no API key required) and displays how far
it is from the user, plus a rough description of where it is.

Public functions:
    get_iss_position()         -> dict  (lat, lon, timestamp, distance_km)
    print_iss_position(iss_data, user_location) -> None
"""

import math
from datetime import UTC, datetime

import requests

# The free, public API that returns real-time ISS coordinates.
# No API key needed, no signup, no rate limit for casual use.
ISS_API_URL = "http://api.open-notify.org/iss-now.json"


# ─────────────────────────────────────────────
# Helper: Haversine formula
# ─────────────────────────────────────────────
def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great-circle distance between two points on Earth
    using the Haversine formula. Returns distance in kilometers.

    Args:
        lat1, lon1: latitude/longitude of point 1 (in degrees)
        lat2, lon2: latitude/longitude of point 2 (in degrees)

    Returns:
        Distance in kilometers, rounded to the nearest whole number.
    """
    # Earth's mean radius in kilometers
    R = 6371.0

    # Convert degrees to radians (math trig functions expect radians)
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    # Haversine formula:
    # a = sin²(Δφ/2) + cos(φ1) * cos(φ2) * sin²(Δλ/2)
    # c = 2 * atan2(√a, √(1−a))
    # d = R*c
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distance_km = R * c
    return round(distance_km)


# ─────────────────────────────────────────────
# Helper: Rough location description
# ─────────────────────────────────────────────
def describe_location(lat: float, lon: float) -> str:
    """
    Give a very rough human-readable description of where the ISS is
    based on its latitude/longitude. This is approximate — it uses
    simple latitude bands and longitude ranges for oceans/continents.

    Args:
        lat: latitude in degrees  (-90 to +90)
        lon: longitude in degrees (-180 to +180)

    Returns:
        A short string like "over the South Atlantic Ocean"
        or "over central Africa".
    """
    # Latitude bands
    if lat > 66.5:
        lat_zone = "the Arctic region"
    elif lat > 23.5:
        lat_zone = "the northern temperate zone"
    elif lat > -23.5:
        lat_zone = "the tropics"
    elif lat > -66.5:
        lat_zone = "the southern temperate zone"
    else:
        lat_zone = "the Antarctic region"

    # Very rough ocean/continent guesses by longitude
    # These are intentionally broad — the ISS moves at ~28,000 km/h
    # so precision isn't the point; this is just for fun.

    if 113 <= lon <= 154 and -44 <= lat <= -10: 
        region = "Over Australia" 
    elif -82 <= lon <= -34 and -56 <= lat <= 13: 
        region = "Over South America" 
    elif -170 <= lon <= -50 and 7 <= lat <= 85: 
        region = "Over North America" 
    elif -25 <= lon <= 40 and 36 <= lat <= 71: 
        region = "Over Europe" 
    elif -18 <= lon <= 52 and -36 <= lat <= 35: 
        region = "Over Africa" 
    elif 26 <= lon <= 180 and -11 <= lat <= 78: 
        region = "Over Asia" 

        # Oceans & Fallback Conditions
    elif -60 <= lon <= 20 and lat < 36: 
        region = "Over the Atlantic Ocean" 
    elif 20 <= lon <= 113 and lat <= 30: 
        region = "Over the Indian Ocean" 
    elif lon < -130 or lon > 154: 
        region = "Over the Pacific Ocean" 
    else: 
        region = f"In {lat_zone}"

    return region


# ─────────────────────────────────────────────
# Main API function
# ─────────────────────────────────────────────
def get_iss_position() -> dict:
    """
    Fetch the ISS's current position from the Open Notify API.

    Returns:
        On success: dict with keys:
            'lat'       (float)  – latitude
            'lon'       (float)  – longitude
            'timestamp' (int)    – Unix timestamp from the API
            'time_utc'  (str)    – human-readable UTC time
            'message'   (str)    – 'success'
        On failure: dict with keys:
            'message'   (str)    – description of what went wrong
            'error'     (bool)   – always True
    """
    try:
        # Give up after 10 seconds if the server doesn't respond
        response = requests.get(ISS_API_URL, timeout=10)
        # Raise an error if HTTP status is 4xx/5xx (e.g. 404, 500)
        response.raise_for_status()
        data = response.json()

        if data.get("message") != "success":
            return {"error": True, "message": "API returned a non-success response."}

        # The API returns lat/lon as STRINGS, so convert them to floats
        lat = float(data["iss_position"]["latitude"])
        lon = float(data["iss_position"]["longitude"])
        ts = data["timestamp"]

        # Convert Unix timestamp to a readable UTC string
        time_utc = datetime.fromtimestamp(ts, tz=UTC).strftime("%Y-%m-%d %H:%M:%S UTC")

        return {
            "lat": lat,
            "lon": lon,
            "timestamp": ts,
            "time_utc": time_utc,
            "message": "success",
        }

    except requests.exceptions.ConnectionError:
        return {
            "error": True,
            "message": "Could not connect. Check your internet connection.",
        }
    except requests.exceptions.Timeout:
        return {"error": True, "message": "Request timed out. The ISS API may be slow."}
    except requests.exceptions.RequestException as e:
        return {"error": True, "message": f"Network error: {e}"}
    except (KeyError, ValueError) as e:
        return {"error": True, "message": f"Unexpected data from API: {e}"}


# ─────────────────────────────────────────────
# Pretty-printer
# ─────────────────────────────────────────────
def print_iss_position(iss_data: dict, user_location: dict):
    """
    Nicely format and display ISS position information.

    Args:
        iss_data: dict returned by get_iss_position()
        user_location: optional dict with 'lat' and 'lon' keys.
                       If provided, shows distance from user.
    """
    # Handle error case first
    if iss_data.get("error"):
        print(f"  🛰️  ISS Tracker: {iss_data['message']}")
        return

    lat = iss_data["lat"]
    lon = iss_data["lon"]
    time_utc = iss_data["time_utc"]
    region = describe_location(lat, lon)

    # Compass directions for latitude/longitude
    lat_dir = "N" if lat >= 0 else "S"
    lon_dir = "E" if lon >= 0 else "W"

    print()
    print("  🛰️  ISS LIVE POSITION")
    print(" " + "=" * 50)
    print(f"     Coordinates:  {abs(lat):.2f}°{lat_dir}, {abs(lon):.2f}°{lon_dir}")
    print(f"     Location:     {region}")
    print(f"     As of:        {time_utc}")

    # Show distance if we have the user's location
    if user_location and "lat" in user_location and "lon" in user_location:
        distance = haversine_distance(
            user_location["lat"], user_location["lon"], lat, lon
        )

        # The ISS is ~408 km above Earth, so straight-line distance
        # uses 3D Pythagoras. But for ground distance the Haversine
        # value is informative enough — show it as a friendly message.
        print(f"     Distance:     ~{distance:,} km from you")

        # Fun fact
        if distance < 2000:
            print("     🌟 The ISS is nearly overhead! Look up!")
        elif distance < 5000:
            print("     👀 The ISS is relatively nearby on this orbit.")
        else:
            print("     💫 The ISS is on the other side of the planet right now.")

    print("  " + "=" * 50)


# ─────────────────────────────────────────────
# Quick self-test when running this file directly
# ─────────────────────────────────────────────
if __name__ == "__main__":
    # When you run `python iss_location.py` by itself,
    # fetch the live ISS position and display it.
    print("Fetching ISS position...")
    iss = get_iss_position()

    # Test with a sample user location (Port Harcourt, Nigeria)
    user = {"lat": 4.8156, "lon": 7.0498, "city": "Port Harcourt"}
    print_iss_position(iss, user)
