"""NASA APOD: placeholder detection, the background walk-back, and outage handling."""

import threading
from datetime import date

import httpx

from app.cache import TTLCache
from app.deps import AppContext
from app.services import apod
from app.storage import JsonHistoryRepository
from app.upstream import UpstreamClient
from tests.conftest import FakeClock, load, png_bytes

APOD = "https://api.nasa.gov/planetary/apod"
PICTURE_URL = "https://apod.nasa.gov/apod/image/2610/nebula_1200.jpg"
TODAY = date(2026, 10, 8)


def picture(day: str, **overrides) -> dict:
    entry = load("apod_image.json") | {"date": day}
    entry.update(overrides)
    return entry


def logo(day: str) -> dict:
    return load("apod_placeholder.json") | {"date": day}


def by_date(entries: dict[str, dict], default: dict | None = None):
    """A respx side effect: the entry for the requested date (no date means the latest)."""

    def handler(request: httpx.Request) -> httpx.Response:
        day = request.url.params.get("date")
        if day is None:
            return httpx.Response(200, json=entries.get("latest", default))
        return httpx.Response(200, json=entries.get(day, default))

    return handler


def test_placeholder_detection_uses_url_and_title():
    assert apod.is_placeholder("https://apod.nasa.gov/apod/image/nasa-logo@2x.png", "Anything")
    assert apod.is_placeholder("https://example.test/x.jpg", "NASA Science")
    assert not apod.is_placeholder("https://apod.nasa.gov/apod/image/2610/nebula.jpg", "Nebula")


def test_placeholder_today_walks_back_to_a_valid_picture(ctx, upstream):
    upstream.get(APOD).mock(
        side_effect=by_date(
            {"latest": logo("2026-10-08"), "2026-10-07": picture("2026-10-07")},
            default=logo("2026-10-06"),
        )
    )
    upstream.get(PICTURE_URL).mock(return_value=httpx.Response(200, content=png_bytes(1200, 800)))

    result = apod.get_background(ctx, TODAY).value
    assert result["is_fallback"] is False
    assert result["date"] == "2026-10-07"
    assert result["hd_url"].endswith("nebula_hd.jpg")
    assert result["credit"] == "Jane Astronomer"
    assert result["page_url"] == "https://apod.nasa.gov/apod/ap261007.html"


def test_all_placeholders_use_the_bundled_fallback(ctx, upstream):
    upstream.get(APOD).mock(side_effect=by_date({}, default=logo("2026-10-08")))
    result = apod.get_background(ctx, TODAY).value
    assert result["is_fallback"] is True
    assert result["image_url"] == "/fallback/night-sky.jpg"
    assert "No valid NASA image" in result["fallback_reason"]


def test_narrow_images_are_rejected(ctx, upstream):
    upstream.get(APOD).mock(side_effect=by_date({}, default=picture("2026-10-08")))
    upstream.get(PICTURE_URL).mock(return_value=httpx.Response(200, content=png_bytes(640, 480)))
    assert apod.get_background(ctx, TODAY).value["is_fallback"] is True


def test_videos_are_skipped(ctx, upstream):
    video = picture("2026-10-08", media_type="video")
    upstream.get(APOD).mock(
        side_effect=by_date(
            {"latest": video, "2026-10-07": picture("2026-10-07")},
            default=logo("2026-10-06"),
        )
    )
    upstream.get(PICTURE_URL).mock(return_value=httpx.Response(200, content=png_bytes(1200, 800)))
    assert apod.get_background(ctx, TODAY).value["date"] == "2026-10-07"


def test_outage_gives_a_fallback_that_is_not_cached(settings, upstream):
    clock = FakeClock()
    context = AppContext(
        settings=settings,
        http=UpstreamClient(),
        cache=TTLCache(clock=clock),
        history=JsonHistoryRepository(settings.history_path),
        lookup_lock=threading.Lock(),
    )
    route = upstream.get(APOD).mock(return_value=httpx.Response(503))
    result = apod.get_background(context, TODAY).value
    assert result["is_fallback"] is True
    assert "unavailable" in result["fallback_reason"]
    assert route.call_count == 2  # one attempt and one retry

    clock.now += 60  # past the negative-cache window
    route.mock(side_effect=by_date({}, default=picture("2026-10-08")))
    upstream.get(PICTURE_URL).mock(return_value=httpx.Response(200, content=png_bytes(1200, 800)))
    recovered = apod.get_background(context, TODAY).value
    assert recovered["is_fallback"] is False
    context.http.close()
