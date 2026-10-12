"""Shared fixtures. Every upstream call is mocked with respx, so tests never touch the network."""

import json
import threading
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path

import httpx
import pytest
import respx
from fastapi.testclient import TestClient
from PIL import Image

from app.cache import TTLCache
from app.config import Settings
from app.deps import AppContext
from app.main import create_app
from app.storage import JsonHistoryRepository
from app.upstream import UpstreamClient

FIXTURES = Path(__file__).parent / "fixtures"
CLIENT_ID = "test-browser-1234"
APOD_SCIENCE_PAGE = "https://science.nasa.gov/apod/"

# The recorded upstream samples in fixtures/ were captured on 2026-10-08, and their ISS
# passes are dated 2026-10-09 and 2026-10-10. Tests that need a pass still to come only
# pass while the real clock sits before those dates, so "now" is frozen there instead.
FIXED_NOW = datetime(2026, 10, 8, 12, 0, tzinfo=UTC)

# Each module binds the function at import time, so every one of them is patched.
CLOCK_MODULES = (
    "app.routes.apod",
    "app.routes.health",
    "app.routes.history",
    "app.routes.iss",
    "app.services.apod",
)


def load(name: str):
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def png_bytes(width: int, height: int) -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (width, height), (5, 10, 20)).save(buffer, "PNG")
    return buffer.getvalue()


class FakeClock:
    def __init__(self) -> None:
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


@pytest.fixture(autouse=True)
def frozen_clock(monkeypatch):
    """Run every test at FIXED_NOW, the moment the recorded fixtures describe."""
    for module in CLOCK_MODULES:
        monkeypatch.setattr(f"{module}.utc_now", lambda: FIXED_NOW)


@pytest.fixture(autouse=True)
def no_retry_delay(monkeypatch):
    monkeypatch.setattr("app.upstream.RETRY_DELAY_SECONDS", 0)


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(
        _env_file=None,
        openweather_api_key="test-owm-key",
        nasa_api_key="test-nasa-key",
        history_path=tmp_path / "history.json",
        # Explicitly off, so a DATABASE_URL in the developer's shell cannot turn the
        # unit tests into database tests. tests/test_storage_postgres.py opts in
        # through SKY_WATCH_TEST_DATABASE_URL instead.
        database_url=None,
        cors_origins="",
        log_level="WARNING",
    )


@pytest.fixture
def ctx(settings) -> AppContext:
    context = AppContext(
        settings=settings,
        http=UpstreamClient(),
        cache=TTLCache(),
        history=JsonHistoryRepository(settings.history_path),
        lookup_lock=threading.Lock(),
    )
    yield context
    context.http.close()


@pytest.fixture
def upstream():
    with respx.mock(assert_all_called=False) as router:
        # app/services/apod.py reads NASA's APOD page when the JSON API sends its logo.
        # This default stands in for a page without a picture, so the rescue is a no-op
        # unless a test replaces it. Same pattern means the same route, so a test that
        # calls upstream.get(APOD_SCIENCE_PAGE).mock(...) takes over.
        router.get(APOD_SCIENCE_PAGE).mock(
            return_value=httpx.Response(200, text="<html><body>No schema block here.</body></html>")
        )
        yield router


@pytest.fixture
def client(settings):
    with TestClient(create_app(settings)) as test_client:
        yield test_client


@pytest.fixture
def client_without_key(settings):
    no_key = settings.model_copy(update={"openweather_api_key": None})
    with TestClient(create_app(no_key)) as test_client:
        yield test_client
