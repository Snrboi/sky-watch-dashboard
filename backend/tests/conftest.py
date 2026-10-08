"""Shared fixtures. Every upstream call is mocked with respx, so tests never touch the network."""

import json
import threading
from io import BytesIO
from pathlib import Path

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
def no_retry_delay(monkeypatch):
    monkeypatch.setattr("app.upstream.RETRY_DELAY_SECONDS", 0)


@pytest.fixture
def settings(tmp_path) -> Settings:
    return Settings(
        _env_file=None,
        openweather_api_key="test-owm-key",
        nasa_api_key="test-nasa-key",
        history_path=tmp_path / "history.json",
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
