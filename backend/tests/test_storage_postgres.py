"""PostgreSQL history repository, and the swap behind DATABASE_URL.

The mapping and settings tests run everywhere. The rest need a real database and are
skipped unless SKY_WATCH_TEST_DATABASE_URL is set:

  SKY_WATCH_TEST_DATABASE_URL=postgresql://skywatch@127.0.0.1:55432/skywatch \\
    uv run pytest tests/test_storage_postgres.py

The table is shared between runs, so every test uses its own random client id.
"""

import os
import uuid
from datetime import UTC, datetime

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.errors import UpstreamUnavailableError
from app.main import create_app
from app.services.stats import compute_stats, parse_recorded
from app.storage_postgres import PostgresHistoryRepository, row_to_record

DATABASE_URL = os.environ.get("SKY_WATCH_TEST_DATABASE_URL")
needs_database = pytest.mark.skipif(
    not DATABASE_URL, reason="set SKY_WATCH_TEST_DATABASE_URL to run database tests"
)


def new_client_id() -> str:
    return f"test-{uuid.uuid4().hex}"


def make_record(client_id: str, *, recorded_at: str, aqi: int | None = 3) -> dict:
    return {
        "id": uuid.uuid4().hex,
        "client_id": client_id,
        "recorded_at": recorded_at,
        "city": "Port Harcourt",
        "state": "Rivers",
        "country": "NG",
        "lat": 4.8156,
        "lon": 7.0498,
        "temp_c": 28.5,
        "aqi": aqi,
        "next_pass_at": "2026-10-13T04:11:11+00:00",
    }


@pytest.fixture
def repository():
    repo = PostgresHistoryRepository(str(DATABASE_URL), max_size=1)
    yield repo
    repo.close()


def test_row_to_record_returns_the_json_shapes():
    row = {
        "id": "abc123",
        "client_id": "test-browser",
        "recorded_at": datetime(2026, 10, 12, 9, 30, tzinfo=UTC),
        "city": "Port Harcourt",
        "state": None,
        "country": "NG",
        "lat": 4.8156,
        "lon": 7.0498,
        "temp_c": 28.5,
        "aqi": None,
        "next_pass_at": None,
    }
    record = row_to_record(row)

    assert record["recorded_at"] == "2026-10-12T09:30:00+00:00"
    assert isinstance(record["recorded_at"], str)  # stats.parse_recorded expects a string
    assert parse_recorded(record) == datetime(2026, 10, 12, 9, 30, tzinfo=UTC)
    assert record["state"] is None
    assert record["aqi"] is None
    assert record["next_pass_at"] is None
    assert record["lat"] == 4.8156
    assert record["country"] == "NG"


def test_row_to_record_treats_naive_timestamps_as_utc():
    row = {
        "id": "abc123",
        "client_id": "test-browser",
        "recorded_at": datetime(2026, 10, 12, 9, 30),
        "city": "Port Harcourt",
        "state": None,
        "country": "NG",
        "lat": 4.8156,
        "lon": 7.0498,
        "temp_c": None,
        "aqi": None,
        "next_pass_at": datetime(2026, 10, 13, 4, 11),
    }
    record = row_to_record(row)

    assert record["recorded_at"] == "2026-10-12T09:30:00+00:00"
    assert record["next_pass_at"] == "2026-10-13T04:11:00+00:00"


def test_database_url_is_normalised():
    settings = Settings(
        _env_file=None,
        database_url="  postgres://user:pass@host:5432/db?sslmode=require  ",
    )
    assert settings.database_url == "postgresql://user:pass@host:5432/db?sslmode=require"
    assert settings.history_backend == "postgres"


def test_blank_database_url_keeps_the_json_file(tmp_path):
    settings = Settings(_env_file=None, database_url="   ", history_path=tmp_path / "history.json")
    assert settings.database_url is None
    assert settings.history_backend == "json"


@needs_database
def test_add_then_list_round_trip(repository):
    client_id = new_client_id()
    other_client = new_client_id()
    older = make_record(client_id, recorded_at="2026-10-12T08:00:00+00:00", aqi=3)
    newer = make_record(client_id, recorded_at="2026-10-12T09:30:00+00:00", aqi=None)

    repository.add(older)
    repository.add(newer)
    repository.add(make_record(other_client, recorded_at="2026-10-12T09:00:00+00:00"))

    records = repository.list_for_client(client_id)

    assert [record["id"] for record in records] == [older["id"], newer["id"]]  # oldest first
    assert records[0]["city"] == "Port Harcourt"
    assert records[0]["temp_c"] == 28.5
    assert records[1]["aqi"] is None
    assert parse_recorded(records[0]) == datetime(2026, 10, 12, 8, 0, tzinfo=UTC)
    assert records[0]["next_pass_at"] == "2026-10-13T04:11:11+00:00"

    # The records have to work with the code that was written for the JSON file.
    stats = compute_stats(records)
    assert stats["total_lookups"] == 2
    assert stats["days_active"] == 1
    assert stats["average_temp_c"] == 28.5
    assert stats["best_aqi"]["aqi"] == 3  # 3 is a valid OWM index; stats drops others
    assert stats["most_searched_city"] == {"city": "Port Harcourt", "lookups": 2}


@needs_database
def test_the_same_id_written_twice_keeps_one_row(repository):
    client_id = new_client_id()
    record = make_record(client_id, recorded_at="2026-10-12T08:00:00+00:00")

    repository.add(record)
    repository.add(record)

    assert [item["id"] for item in repository.list_for_client(client_id)] == [record["id"]]


@needs_database
def test_unknown_client_lists_nothing(repository):
    assert repository.list_for_client(new_client_id()) == []
    assert repository.list_for_client("") == []


@needs_database
def test_history_endpoint_reads_from_the_database():
    client_id = new_client_id()
    repository = PostgresHistoryRepository(str(DATABASE_URL), max_size=1)
    repository.add(make_record(client_id, recorded_at="2026-10-12T09:30:00+00:00"))
    repository.close()

    settings = Settings(
        _env_file=None,
        openweather_api_key="test-owm-key",
        nasa_api_key="test-nasa-key",
        database_url=str(DATABASE_URL),
        cors_origins="",
        log_level="WARNING",
    )
    headers = {"X-Client-Id": client_id}
    with TestClient(create_app(settings)) as client:
        listed = client.get("/api/history", headers=headers)
        stats = client.get("/api/history/stats", headers=headers)

    assert listed.status_code == 200
    entries = listed.json()["entries"]
    assert [entry["city"] for entry in entries] == ["Port Harcourt"]
    assert parse_recorded(entries[0]) == datetime(2026, 10, 12, 9, 30, tzinfo=UTC)
    assert stats.status_code == 200
    assert stats.json()["total_lookups"] == 1


def test_history_still_works_without_database_url(tmp_path):
    """The default stays the JSON file, and that path never opens a pool."""
    settings = Settings(
        _env_file=None,
        openweather_api_key="test-owm-key",
        history_path=tmp_path / "history.json",
        log_level="WARNING",
    )
    with TestClient(create_app(settings)) as client:
        response = client.get("/api/history", headers={"X-Client-Id": new_client_id()})

    assert response.status_code == 200
    assert response.json() == {"entries": []}
    assert not (tmp_path / "history.json").exists()  # nothing written for an empty read


def test_a_dead_database_is_a_503_not_a_500(monkeypatch):
    """The pool's own errors are mapped to the app's error envelope, source included."""

    class BrokenPool:
        """Stands in for the pool without waiting for a real connection timeout."""

        closed = False

        def open(self) -> None:
            return None

        def close(self) -> None:
            return None

        def connection(self):
            raise psycopg.OperationalError("connection refused")

    repository = PostgresHistoryRepository("postgresql://skywatch@127.0.0.1:1/skywatch", max_size=1)
    monkeypatch.setattr(repository, "_pool", BrokenPool())
    try:
        with pytest.raises(UpstreamUnavailableError) as raised:
            repository.list_for_client("test-browser-1234")
    finally:
        repository.close()

    assert raised.value.status_code == 503
    assert raised.value.source == "database"
    assert "database could not be reached" in raised.value.message
