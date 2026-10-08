"""Contract tests: every endpoint in PRD section 8.3, through the real app with mocked upstreams."""

import httpx

from tests.conftest import CLIENT_ID, load, png_bytes

OWM_WEATHER = "https://api.openweathermap.org/data/2.5/weather"
OWM_AIR = "https://api.openweathermap.org/data/2.5/air_pollution"
OWM_GEO = "https://api.openweathermap.org/geo/1.0/direct"
WHERETHEISS = "https://api.wheretheiss.at/v1/satellites/25544"
POLLUX = "https://iss-api.polluxlabs.io/iss-pass"
APOD = "https://api.nasa.gov/planetary/apod"
PICTURE_URL = "https://apod.nasa.gov/apod/image/2610/nebula_1200.jpg"
HEADERS = {"X-Client-Id": CLIENT_ID}


def mock_core_sources(upstream):
    upstream.get(OWM_WEATHER).mock(return_value=httpx.Response(200, json=load("owm_weather.json")))
    upstream.get(OWM_AIR).mock(
        return_value=httpx.Response(200, json=load("owm_air_pollution.json"))
    )
    upstream.get(POLLUX).mock(return_value=httpx.Response(200, json=load("pollux_passes.json")))


def test_health(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["version"] == "0.2.0"


def test_geocode_dedupes_and_respects_limit(client, upstream):
    upstream.get(OWM_GEO).mock(return_value=httpx.Response(200, json=load("owm_geocode.json")))
    body = client.get("/api/geocode", params={"q": "Port Harcourt"}).json()
    assert [place["name"] for place in body["results"]] == ["Port Harcourt", "Portharcourt Road"]
    limited = client.get("/api/geocode", params={"q": "Port Harcourt", "limit": 1}).json()
    assert len(limited["results"]) == 1
    assert body["stale"] is False


def test_geocode_needs_two_characters(client):
    response = client.get("/api/geocode", params={"q": "a"})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "BAD_INPUT"


def test_missing_key_is_not_configured_not_a_crash(client_without_key):
    response = client_without_key.get("/api/weather", params={"lat": 4.8, "lon": 7.0})
    assert response.status_code == 503
    error = response.json()["error"]
    assert error["code"] == "NOT_CONFIGURED"
    assert error["source"] == "weather"
    assert "OPENWEATHER_API_KEY" in error["message"]


def test_weather_success(client, upstream):
    upstream.get(OWM_WEATHER).mock(return_value=httpx.Response(200, json=load("owm_weather.json")))
    body = client.get("/api/weather", params={"lat": 4.8156, "lon": 7.0498}).json()
    assert body["temp_c"] == 28.4
    assert body["wind_kph"] == 15.1
    assert body["icon"] == "clouds"
    assert body["stale"] is False
    assert body["fetched_at"].endswith("Z") or "+00:00" in body["fetched_at"]


def test_weather_upstream_down_is_a_503_envelope(client, upstream):
    upstream.get(OWM_WEATHER).mock(return_value=httpx.Response(500))
    response = client.get("/api/weather", params={"lat": 4.8, "lon": 7.0})
    assert response.status_code == 503
    assert response.json()["error"] == {
        "code": "UPSTREAM_UNAVAILABLE",
        "source": "weather",
        "message": response.json()["error"]["message"],
    }


def test_air_quality_success(client, upstream):
    upstream.get(OWM_AIR).mock(
        return_value=httpx.Response(200, json=load("owm_air_pollution.json"))
    )
    body = client.get("/api/air-quality", params={"lat": 4.8, "lon": 7.0}).json()
    assert body["aqi"] == 3
    assert body["label"] == "Moderate"
    assert body["color"] == "moderate"
    assert body["pollutants"]["pm2_5"] == 18.6


def test_iss_position_adds_distance_when_a_place_is_given(client, upstream):
    upstream.get(WHERETHEISS).mock(
        return_value=httpx.Response(200, json=load("wheretheiss_iss.json"))
    )
    body = client.get("/api/iss/position", params={"lat": 4.8156, "lon": 7.0498}).json()
    assert body["source"] == "wheretheiss.at"
    assert body["distance_km"] > 0
    assert body["region"].startswith("Roughly over ")


def test_iss_position_without_a_place_has_no_distance(client, upstream):
    upstream.get(WHERETHEISS).mock(
        return_value=httpx.Response(200, json=load("wheretheiss_iss.json"))
    )
    body = client.get("/api/iss/position").json()
    assert body["distance_km"] is None


def test_iss_position_needs_both_coordinates(client):
    response = client.get("/api/iss/position", params={"lat": 4.8})
    assert response.status_code == 400


def test_passes_return_rated_visible_passes(client, upstream):
    upstream.get(POLLUX).mock(return_value=httpx.Response(200, json=load("pollux_passes.json")))
    body = client.get("/api/iss/passes", params={"lat": 4.8156, "lon": 7.0498, "limit": 5}).json()
    assert body["tle_stale"] is False
    assert body["passes"][0]["visible_duration_sec"] == 281
    assert {item["rating"] for item in body["passes"]} <= {"excellent", "good", "low"}


def test_passes_limit_is_checked(client):
    response = client.get("/api/iss/passes", params={"lat": 4.8, "lon": 7.0, "limit": 9})
    assert response.status_code == 400


def test_apod_rejects_bad_and_future_dates(client):
    assert client.get("/api/apod", params={"date": "2026-13-40"}).status_code == 400
    assert client.get("/api/apod", params={"date": "1900-01-01"}).status_code == 400
    assert client.get("/api/apod", params={"date": "2999-01-01"}).status_code == 400


def test_apod_entry_flags_placeholders(client, upstream):
    upstream.get(APOD).mock(return_value=httpx.Response(200, json=load("apod_placeholder.json")))
    body = client.get("/api/apod", params={"date": "2026-10-08"}).json()
    assert body["is_placeholder"] is True
    assert body["page_url"] == "https://apod.nasa.gov/apod/ap261008.html"


def test_background_endpoint_returns_a_valid_picture(client, upstream):
    upstream.get(APOD).mock(return_value=httpx.Response(200, json=load("apod_image.json")))
    upstream.get(PICTURE_URL).mock(return_value=httpx.Response(200, content=png_bytes(1600, 900)))
    body = client.get("/api/apod/background").json()
    assert body["is_fallback"] is False
    assert body["image_url"] == load("apod_image.json")["url"]


def test_history_records_once_then_throttles(client, upstream):
    mock_core_sources(upstream)
    place = {
        "city": "Port Harcourt",
        "state": "Rivers",
        "country": "NG",
        "lat": 4.8156,
        "lon": 7.0498,
    }
    first = client.post("/api/history", headers=HEADERS, json=place).json()
    assert first["recorded"] is True
    assert first["entry"]["temp_c"] == 28.4
    assert first["entry"]["aqi"] == 3
    assert first["entry"]["next_pass_at"] is not None

    second = client.post("/api/history", headers=HEADERS, json=place).json()
    assert second["recorded"] is False
    assert second["throttled_until"] is not None

    listed = client.get("/api/history", headers=HEADERS).json()
    assert len(listed["entries"]) == 1
    stats = client.get("/api/history/stats", headers=HEADERS).json()
    assert stats["total_lookups"] == 1
    assert stats["lookups_with_pass"] == 1


def test_history_is_per_browser(client, upstream):
    mock_core_sources(upstream)
    place = {"city": "Lagos", "country": "NG", "lat": 6.5244, "lon": 3.3792}
    client.post("/api/history", headers=HEADERS, json=place)
    other = {"X-Client-Id": "another-browser-99"}
    assert client.get("/api/history", headers=other).json()["entries"] == []


def test_history_needs_a_client_id(client):
    assert client.get("/api/history").status_code == 400
    assert client.post("/api/history", json={"city": "A", "lat": 1, "lon": 1}).status_code == 400


def test_history_filters_by_city(client, upstream):
    mock_core_sources(upstream)
    client.post(
        "/api/history",
        headers=HEADERS,
        json={"city": "Lagos", "country": "NG", "lat": 6.5, "lon": 3.4},
    )
    client.post(
        "/api/history",
        headers=HEADERS,
        json={"city": "Abuja", "country": "NG", "lat": 9.1, "lon": 7.5},
    )
    lagos = client.get("/api/history", headers=HEADERS, params={"city": "lagos"}).json()["entries"]
    assert [entry["city"] for entry in lagos] == ["Lagos"]


def test_history_rejects_bad_coordinates(client):
    response = client.post(
        "/api/history",
        headers=HEADERS,
        json={"city": "Nowhere", "country": "XX", "lat": 120, "lon": 0},
    )
    assert response.status_code == 400


def test_unknown_api_route_uses_the_error_envelope(client):
    response = client.get("/api/does-not-exist")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"
