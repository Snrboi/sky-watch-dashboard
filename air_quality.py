import os
import requests

BASE_URL = "https://api.openweathermap.org/data/2.5"
TIMEOUT = 10

AQI_LEVELS = {
    1: ("Good", "🟩", "Air quality is good. Enjoy your time outdoors!"),
    2: ("Fair", "🟢", "Acceptable. Unusually sensitive people should keep outdoor exertion short."),
    3: ("Moderate", "🟡", "Sensitive groups should limit prolonged outdoor exertion."),
    4: ("Poor", "🟠", "Everyone should reduce prolonged outdoor exertion."),
    5: ("Very Poor", "🔴", "Avoid outdoor activity and keep windows closed."),
}

def get_air_quality(location: dict) -> dict:
    result = {"aqi": None, "aqi_label": "Unknown", "aqi_emoji": "⚠️", "pollutants": {}, "error": None}
    try:
        lat, lon = float(location["lat"]), float(location["lon"])
    except (TypeError, KeyError, ValueError):
        result["error"] = "location must be a dict with numeric 'lat' and 'lon'"
        return result
    api_key = os.getenv("OWM_API_KEY")
    if not api_key:
        try:
            lines = [line for line in open(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")) if line.startswith("OWM_API_KEY=")]
            api_key = lines[0].split("=", 1)[1].strip() if lines else None
        except FileNotFoundError:
            api_key = None
    if not api_key:
        result["error"] = "OWM_API_KEY not set — check your .env file"
        return result
    params = {"lat": lat, "lon": lon, "appid": api_key}
    try:
        response = requests.get(f"{BASE_URL}/air_pollution", params=params, timeout=TIMEOUT)
        response.raise_for_status()
        first = response.json()["list"][0]
        aqi = int(first["main"]["aqi"])
        label, emoji, _ = AQI_LEVELS.get(aqi, ("Unknown", "❔", "No advice available."))
        pollutants = {code: first.get("components", {}).get(code) for code in ("pm2_5", "pm10", "o3", "no2", "so2", "co", "nh3", "no")}
        result.update({"aqi": aqi, "aqi_label": label, "aqi_emoji": emoji, "pollutants": pollutants})
    except Exception as e:
        result["error"] = f"air quality lookup failed: {e}"
    return result

def print_air_quality(aq_data: dict) -> None:
    if not isinstance(aq_data, dict) or aq_data.get("error"):
        msg = aq_data.get("error", "no data") if isinstance(aq_data, dict) else "no data"
        print(f"🌫️  AIR QUALITY — ⚠️ data unavailable ({msg})")
        return
    label, emoji, advice = AQI_LEVELS.get(aq_data["aqi"], ("Unknown", "❔", "No advice available."))
    p = aq_data["pollutants"]
    print("    \n   🌫️  AIR QUALITY\n")
    print(f"   AQI {aq_data['aqi']}/5 {emoji} {label}")
    print(f"   PM2.5: {p.get('pm2_5')}  PM10: {p.get('pm10')}  O₃: {p.get('o3')}  NO₂: {p.get('no2')} μg/m³")
    print(f"   SO₂: {p.get('so2')}  CO: {p.get('co')}  NH₃: {p.get('nh3')}  NO: {p.get('no')} μg/m³")
    print(f"   💡 {advice}\n")

if __name__ == "__main__":
    loc = {"city": "Port Harcourt", "country": "NG", "lat": 4.822219, "lon": 7.005408}
    print_air_quality(get_air_quality(loc))
