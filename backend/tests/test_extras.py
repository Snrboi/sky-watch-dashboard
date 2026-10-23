"""Tests for the extras: forecasts, trends, tracks, astros, and history tools."""

import csv
import io

import httpx

from app.services import air_quality as aqi_service
from app.services import stats as stats_service
from app.services import weather as weather_service
from tests.conftest import CLIENT_ID, FIXED_NOW, load
from tests.test_api import mock_core_sources

OWM_WEATHER = "https://api.openweathermap.org/data/2.5/weather"
OWM_FORECAST = "https://api.openweathermap.org/data/2.5/forecast"
OWM_AIR = "https://api.openweathermap.org/data/2.5/air_pollution"
OWM_AIR_HISTORY = "https://api.openweathermap.org/data/2.5/air_pollution/history"
OWM_GEO = "https://api.openweathermap.org/geo/1.0/direct"
OWM_GEO_REVERSE = "https://api.openweathermap.org/geo/1.0/reverse"
WHERETHEISS = "https://api.wheretheiss.at/v1/satellites/25544"
WHERETHEISS_POSITIONS = "https://api.wheretheiss.at/v1/satellites/25544/positions"
OPEN_NOTIFY_ASTROS = "http://api.open-notify.org/astros.json"
APOD = "https://api.nasa.gov/planetary/apod"
HEADERS = {"X-Client-Id": CLIENT_ID}


def test_weather_advice_and_sun_times():
    data = {
        "main": {"temp": 29.4, "feels_like": 33.1, "humidity": 78},
        "wind": {"speed": 4.2},
        "weather": [{"main": "Rain", "description": "light rain"}],
        "sys": {"sunrise": 1791430800, "sunset": 1791474000},
    }
    parsed = weather_service.parse_weather(data, 4.8, 7.0)
    assert parsed["advice"] == "Take an umbrella."
    assert parsed["sunrise_at"] is not None
    assert parsed["sunset_at"] is not None
    assert parsed["sunrise_at"].tzinfo is not None


def test_weather_advice_is_none_when_nothing_stands_out():
    advice = weather_service.weather_advice("Clouds", 22.0, "overcast")
    assert advice is None


def test_forecast_endpoint_returns_24_hourly_estimates(client, upstream):
    upstream.get(OWM_FORECAST).mock(
        return_value=httpx.Response(200, json=load("owm_forecast.json"))
    )
    body = client.get("/api/weather/forecast", params={"lat": 4.8, "lon": 7.0}).json()
    assert len(body["points"]) == 24
    assert body["points"][0]["temp_c"] == 27.9
    assert body["points"][1]["temp_c"] == 28.1
    assert "T" in body["points"][0]["at"]


def test_air_quality_flags_who_exceedances():
    pollutants = {"pm2_5": 18.6, "pm10": 32.1, "o3": 45.3, "no2": 12.1}
    assert aqi_service.who_over(pollutants) == ["PM2.5"]


def test_air_quality_endpoint_carries_the_flags(client, upstream):
    upstream.get(OWM_AIR).mock(
        return_value=httpx.Response(200, json=load("owm_air_pollution.json"))
    )
    body = client.get("/api/air-quality", params={"lat": 4.8, "lon": 7.0}).json()
    assert body["who_over"] == ["PM2.5"]


def test_air_quality_history_endpoint(client, upstream):
    upstream.get(OWM_AIR_HISTORY).mock(
        return_value=httpx.Response(200, json=load("owm_air_history.json"))
    )
    response = client.get("/api/air-quality/history", params={"lat": 4.8, "lon": 7.0})
    body = response.json()
    assert response.status_code == 200
    assert len(body["points"]) == 3
    assert body["points"][0]["aqi"] == 2


def test_iss_position_carries_the_sun_coordinates(client, upstream):
    upstream.get(WHERETHEISS).mock(
        return_value=httpx.Response(200, json=load("wheretheiss_iss.json"))
    )
    body = client.get("/api/iss/position").json()
    assert body["solar_lat"] < 0
    assert body["solar_lon"] > 0
    assert body["sunlit"] is True


def test_iss_track_endpoint(client, upstream):
    upstream.get(WHERETHEISS_POSITIONS).mock(
        return_value=httpx.Response(200, json=load("wheretheiss_track.json"))
    )
    body = client.get("/api/iss/track", params={"minutes": 2}).json()
    assert len(body["points"]) == 5
    assert body["points"][0]["lat"] == 8.39


def test_iss_track_samples_a_wide_window(client, upstream):
    upstream.get(WHERETHEISS_POSITIONS).mock(
        return_value=httpx.Response(200, json=load("wheretheiss_track.json"))
    )
    response = client.get("/api/iss/track", params={"minutes": 120})
    assert response.status_code == 200
    # The upstream saw 45 timestamps, not 241.
    request = upstream.get(WHERETHEISS_POSITIONS).calls[0].request
    assert len(request.url.params["timestamps"].split(",")) == 45


def test_iss_track_bounds_the_window(client):
    response = client.get("/api/iss/track", params={"minutes": 500})
    assert response.status_code == 400


def test_astros_endpoint(client, upstream):
    upstream.get(OPEN_NOTIFY_ASTROS).mock(
        return_value=httpx.Response(200, json=load("open_notify_astros.json"))
    )
    body = client.get("/api/iss/astros").json()
    assert body["count"] == 7
    assert body["people"][0]["craft"] == "ISS"


def test_random_apod_endpoint(client, upstream):
    # count=1 makes NASA answer with a list holding one entry.
    upstream.get(APOD).mock(return_value=httpx.Response(200, json=[load("apod_image.json")]))
    body = client.get("/api/apod/random").json()
    assert body["is_placeholder"] is False
    assert body["title"]


def test_reverse_geocode_endpoint(client, upstream):
    upstream.get(OWM_GEO_REVERSE).mock(
        return_value=httpx.Response(200, json=load("owm_geocode.json"))
    )
    body = client.get("/api/geocode/reverse", params={"lat": 4.8156, "lon": 7.0498}).json()
    assert body["results"][0]["name"] == "Port Harcourt"


def test_health_reports_the_history_backend(client):
    body = client.get("/api/health").json()
    assert body["history_backend"] == "json"


def test_history_delete_empties_this_browser(client, upstream):
    mock_core_sources(upstream)
    client.post(
        "/api/history",
        headers=HEADERS,
        json={"city": "Lagos", "country": "NG", "lat": 6.5, "lon": 3.4},
    )
    listed = client.get("/api/history", headers=HEADERS).json()
    assert len(listed["entries"]) == 1

    response = client.delete("/api/history", headers=HEADERS)
    assert response.status_code == 200
    assert response.json() == {"entries": []}
    assert client.get("/api/history", headers=HEADERS).json()["entries"] == []


def test_history_csv_endpoint(client, upstream):
    mock_core_sources(upstream)
    client.post(
        "/api/history",
        headers=HEADERS,
        json={"city": "Lagos", "country": "NG", "lat": 6.5, "lon": 3.4},
    )
    response = client.get("/api/history.csv", headers=HEADERS)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers["content-disposition"]
    rows = list(csv.DictReader(io.StringIO(response.text)))
    assert rows[0]["city"] == "Lagos"


def test_stats_report_extremes_and_the_busiest_hour(ctx):
    records = [
        {"recorded_at": "2026-10-01T10:00:00+00:00", "temp_c": 24.0, "city": "Lagos"},
        {"recorded_at": "2026-10-02T10:30:00+00:00", "temp_c": 31.5, "city": "Lagos"},
        {"recorded_at": "2026-10-03T10:45:00+00:00", "temp_c": 29.0, "city": "Abuja"},
        {"recorded_at": "2026-10-04T22:00:00+00:00", "temp_c": 27.0, "city": "Abuja"},
    ]
    stats = stats_service.compute_stats(records)
    assert stats["coldest"] == {"temp_c": 24.0, "date": "2026-10-01"}
    assert stats["warmest"] == {"temp_c": 31.5, "date": "2026-10-02"}
    assert stats["peak_hour_utc"] == 10


def test_stats_have_no_extremes_without_readings(ctx):
    stats = stats_service.compute_stats([{"recorded_at": FIXED_NOW.isoformat(), "city": "Lagos"}])
    assert stats["coldest"] is None
    assert stats["warmest"] is None
    assert stats["peak_hour_utc"] is not None
