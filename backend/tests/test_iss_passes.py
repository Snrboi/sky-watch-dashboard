"""ISS position (with fallback) and the pass list (ratings, visible duration, stale passes)."""

import copy
from datetime import UTC, datetime

import httpx
import pytest

from app.errors import UpstreamUnavailableError
from app.services import iss_passes, iss_position
from tests.conftest import load

WHERETHEISS = "https://api.wheretheiss.at/v1/satellites/25544"
OPEN_NOTIFY = "http://api.open-notify.org/iss-now.json"
POLLUX = "https://iss-api.polluxlabs.io/iss-pass"


def test_position_uses_wheretheiss_and_computes_distance(ctx, upstream):
    upstream.get(WHERETHEISS).mock(
        return_value=httpx.Response(200, json=load("wheretheiss_iss.json"))
    )
    position = iss_position.get_position(ctx).value
    view = iss_position.describe_position(position, 4.8156, 7.0498)
    assert view["source"] == "wheretheiss.at"
    assert view["sunlit"] is True
    assert view["altitude_km"] == pytest.approx(423.55, abs=0.01)
    assert view["distance_km"] > 0
    assert view["region"].startswith("Roughly over ")


def test_eclipsed_station_is_not_sunlit(ctx, upstream):
    data = load("wheretheiss_iss.json")
    data["visibility"] = "eclipsed"
    upstream.get(WHERETHEISS).mock(return_value=httpx.Response(200, json=data))
    assert iss_position.get_position(ctx).value["sunlit"] is False


def test_falls_back_to_open_notify_when_the_primary_fails(ctx, upstream):
    upstream.get(WHERETHEISS).mock(return_value=httpx.Response(500))
    upstream.get(OPEN_NOTIFY).mock(
        return_value=httpx.Response(200, json=load("open_notify_iss.json"))
    )
    position = iss_position.get_position(ctx).value
    assert position["source"] == "open-notify"
    assert position["lat"] == pytest.approx(-12.3456)
    assert position["altitude_km"] is None
    assert position["sunlit"] is None


def test_both_sources_down_is_an_upstream_error(ctx, upstream):
    upstream.get(WHERETHEISS).mock(return_value=httpx.Response(500))
    upstream.get(OPEN_NOTIFY).mock(return_value=httpx.Response(500))
    with pytest.raises(UpstreamUnavailableError) as raised:
        iss_position.get_position(ctx)
    assert raised.value.source == "iss"


@pytest.mark.parametrize(
    ("max_elevation", "rating"),
    [(62.4, "excellent"), (45.0, "excellent"), (44.9, "good"), (20.0, "good"), (19.9, "low")],
)
def test_rating_thresholds(max_elevation, rating):
    assert iss_passes.rate_pass(max_elevation) == rating


def test_passes_show_visible_duration_not_time_above_horizon(ctx, upstream):
    upstream.get(POLLUX).mock(return_value=httpx.Response(200, json=load("pollux_passes.json")))
    now = datetime(2026, 10, 8, 12, 0, tzinfo=UTC)
    passes = iss_passes.get_passes(ctx, 4.8156, 7.0498, now=now, limit=5).value["passes"]
    assert passes[0]["visible_duration_sec"] == 281  # not duration_sec (404)
    assert passes[0]["rating"] == "low"  # peak 17.5 degrees
    assert passes[1]["rating"] == "excellent"  # peak 62.4 degrees


def test_passes_that_already_ended_are_dropped(ctx, upstream):
    upstream.get(POLLUX).mock(return_value=httpx.Response(200, json=load("pollux_passes.json")))
    now = datetime(2026, 10, 9, 5, 0, tzinfo=UTC)  # after the first pass has finished
    passes = iss_passes.get_passes(ctx, 4.8156, 7.0498, now=now, limit=5).value["passes"]
    assert len(passes) == 1
    assert passes[0]["rise_at"].hour == 5


def test_malformed_pass_is_skipped_not_fatal(ctx, upstream):
    data = copy.deepcopy(load("pollux_passes.json"))
    data["passes"].insert(0, {"rise": {"compass": "N"}})  # no time, no culmination
    upstream.get(POLLUX).mock(return_value=httpx.Response(200, json=data))
    now = datetime(2026, 10, 8, 12, 0, tzinfo=UTC)
    passes = iss_passes.get_passes(ctx, 4.8156, 7.0498, now=now, limit=5).value["passes"]
    assert len(passes) == 2


def test_pass_limit_is_applied(ctx, upstream):
    upstream.get(POLLUX).mock(return_value=httpx.Response(200, json=load("pollux_passes.json")))
    now = datetime(2026, 10, 8, 12, 0, tzinfo=UTC)
    assert len(iss_passes.get_passes(ctx, 4.8156, 7.0498, now=now, limit=1).value["passes"]) == 1
