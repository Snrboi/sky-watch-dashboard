"""TTL cache behaviour, and the shared HTTP client: retries, timeouts, typed errors, images."""

from datetime import UTC, datetime

import httpx
import pytest

from app.cache import TTLCache
from app.errors import UpstreamUnavailableError
from app.upstream import UpstreamClient
from tests.conftest import FakeClock, png_bytes

URL = "https://example.test/data"


def test_fresh_value_is_reused_without_fetching_again():
    clock = FakeClock()
    cache = TTLCache(clock=clock)
    calls = []

    def fetch():
        calls.append(1)
        return "value"

    first = cache.get_or_fetch("key", 10, fetch)
    second = cache.get_or_fetch("key", 10, fetch)
    assert first.value == second.value == "value"
    assert len(calls) == 1
    assert second.stale is False


def test_expired_value_is_fetched_again():
    clock = FakeClock()
    cache = TTLCache(clock=clock)
    calls = []
    cache.get_or_fetch("key", 10, lambda: calls.append(1) or "value")
    clock.now += 11
    cache.get_or_fetch("key", 10, lambda: calls.append(1) or "value")
    assert len(calls) == 2


def test_stale_value_is_served_when_the_upstream_fails():
    clock = FakeClock()
    cache = TTLCache(clock=clock, now=lambda: datetime(2026, 10, 8, tzinfo=UTC))
    cache.get_or_fetch("key", 10, lambda: "good")
    clock.now += 11

    def broken():
        raise UpstreamUnavailableError("down", source="test")

    served = cache.get_or_fetch("key", 10, broken)
    assert served.value == "good"
    assert served.stale is True


def test_failure_with_nothing_cached_is_remembered_briefly():
    clock = FakeClock()
    cache = TTLCache(clock=clock)
    calls = []

    def broken():
        calls.append(1)
        raise UpstreamUnavailableError("down", source="test")

    with pytest.raises(UpstreamUnavailableError):
        cache.get_or_fetch("key", 60, broken)
    with pytest.raises(UpstreamUnavailableError):
        cache.get_or_fetch("key", 60, broken)
    assert len(calls) == 1  # the second call did not hit the upstream

    clock.now += 16  # past the 15 s negative-cache window
    with pytest.raises(UpstreamUnavailableError):
        cache.get_or_fetch("key", 60, broken)
    assert len(calls) == 2


def test_server_error_is_retried_once(upstream):
    route = upstream.get(URL).mock(
        side_effect=[httpx.Response(503), httpx.Response(200, json={"ok": True})]
    )
    assert UpstreamClient().get_json("demo", URL) == {"ok": True}
    assert route.call_count == 2


def test_client_error_is_not_retried(upstream):
    route = upstream.get(URL).mock(return_value=httpx.Response(404))
    with pytest.raises(UpstreamUnavailableError):
        UpstreamClient().get_json("demo", URL)
    assert route.call_count == 1


def test_timeouts_become_typed_errors_after_one_retry(upstream):
    route = upstream.get(URL).mock(side_effect=httpx.ReadTimeout("slow"))
    with pytest.raises(UpstreamUnavailableError) as raised:
        UpstreamClient().get_json("demo", URL)
    assert "timed out" in raised.value.message
    assert route.call_count == 2


def test_non_json_body_is_a_typed_error(upstream):
    upstream.get(URL).mock(return_value=httpx.Response(200, text="<html>nope</html>"))
    with pytest.raises(UpstreamUnavailableError):
        UpstreamClient().get_json("demo", URL)


def test_image_size_reads_the_header_only(upstream):
    upstream.get(URL).mock(return_value=httpx.Response(200, content=png_bytes(1200, 800)))
    assert UpstreamClient().image_size("demo", URL) == (1200, 800)


def test_nasa_logo_placeholder_is_narrow(upstream):
    upstream.get(URL).mock(return_value=httpx.Response(200, content=png_bytes(121, 102)))
    assert UpstreamClient().image_size("demo", URL) == (121, 102)


def test_non_image_bytes_have_no_size(upstream):
    upstream.get(URL).mock(return_value=httpx.Response(200, content=b"not an image" * 500))
    assert UpstreamClient().image_size("demo", URL) is None


def test_cache_stays_within_its_size_limit():
    cache = TTLCache(clock=FakeClock(), max_entries=3)
    for index in range(10):
        cache.get_or_fetch(f"key-{index}", 60, lambda index=index: index)
    assert len(cache._values) <= 3
    assert cache.get_or_fetch("key-9", 60, lambda: "other").value == 9
