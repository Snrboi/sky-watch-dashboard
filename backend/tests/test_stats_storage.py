"""Pure statistics, and the JSON history repository (per-browser, atomic, tolerant of damage)."""

import json

from app.config import BACKEND_DIR, Settings
from app.services.stats import compute_stats
from app.storage import JsonHistoryRepository


def record(recorded_at: str, city: str = "Port Harcourt", **overrides) -> dict:
    base = {
        "recorded_at": recorded_at,
        "city": city,
        "temp_c": 28.0,
        "aqi": 2,
        "next_pass_at": None,
    }
    base.update(overrides)
    return base


def test_empty_history_has_zeroes_and_no_trend():
    stats = compute_stats([])
    assert stats["total_lookups"] == 0
    assert stats["average_temp_c"] is None
    assert stats["best_aqi"] is None
    assert stats["trend"] == []


def test_nulls_are_ignored_instead_of_crashing():
    stats = compute_stats(
        [
            record("2026-10-07T09:00:00+00:00", temp_c=None, aqi=None),
            record("2026-10-07T10:00:00+00:00", temp_c=30.0, aqi=4),
        ]
    )
    assert stats["total_lookups"] == 2
    assert stats["average_temp_c"] == 30.0
    assert stats["best_aqi"]["aqi"] == 4
    assert stats["worst_aqi"]["aqi"] == 4


def test_every_aqi_five_does_not_crash():
    stats = compute_stats(
        [
            record("2026-10-07T09:00:00+00:00", aqi=5),
            record("2026-10-08T09:00:00+00:00", aqi=5),
        ]
    )
    assert stats["best_aqi"] == {"aqi": 5, "label": "Very Poor", "date": "2026-10-07"}
    assert stats["worst_aqi"]["date"] == "2026-10-07"


def test_cities_are_counted_without_case_and_days_use_utc():
    stats = compute_stats(
        [
            record("2026-10-07T23:30:00+00:00", city="Port Harcourt"),
            record("2026-10-08T00:30:00+00:00", city="port harcourt"),
            record(
                "2026-10-08T01:00:00+00:00", city="Lagos", next_pass_at="2026-10-09T05:00:00+00:00"
            ),
        ]
    )
    assert stats["unique_cities"] == 2
    assert stats["most_searched_city"] == {"city": "Port Harcourt", "lookups": 2}
    assert stats["days_active"] == 2
    assert stats["lookups_with_pass"] == 1


def test_trend_is_daily_and_sorted():
    stats = compute_stats(
        [
            record("2026-10-08T09:00:00+00:00", temp_c=20.0, aqi=1),
            record("2026-10-07T09:00:00+00:00", temp_c=30.0, aqi=3),
            record("2026-10-07T12:00:00+00:00", temp_c=31.0, aqi=None),
        ]
    )
    assert [point["date"] for point in stats["trend"]] == ["2026-10-07", "2026-10-08"]
    assert stats["trend"][0] == {"date": "2026-10-07", "avg_temp_c": 30.5, "avg_aqi": 3.0}


def test_repository_scopes_records_to_one_browser(tmp_path):
    repo = JsonHistoryRepository(tmp_path / "history.json")
    repo.add({"client_id": "browser-a", "city": "A"})
    repo.add({"client_id": "browser-b", "city": "B"})
    assert [item["city"] for item in repo.list_for_client("browser-a")] == ["A"]


def test_writes_are_atomic_and_leave_no_temp_files(tmp_path):
    repo = JsonHistoryRepository(tmp_path / "history.json")
    repo.add({"client_id": "browser-a", "city": "A"})
    assert sorted(path.name for path in tmp_path.iterdir()) == ["history.json"]
    assert json.loads((tmp_path / "history.json").read_text())[0]["city"] == "A"


def test_corrupt_history_is_moved_aside_not_overwritten(tmp_path):
    path = tmp_path / "history.json"
    path.write_text("{not json", encoding="utf-8")
    repo = JsonHistoryRepository(path)
    assert repo.list_for_client("browser-a") == []
    assert (tmp_path / "history.json.corrupt").read_text(encoding="utf-8") == "{not json"


def test_relative_history_path_resolves_from_backend_not_cwd():
    settings = Settings(_env_file=None, history_path="data/custom.json")
    assert settings.history_path == BACKEND_DIR / "data" / "custom.json"
    absolute = Settings(_env_file=None, history_path="/tmp/elsewhere.json")
    assert str(absolute.history_path) == "/tmp/elsewhere.json"
