"""Shared outbound HTTP client: 10 s timeouts, one retry for GET, typed failures."""

import logging
import time
from collections.abc import Mapping
from typing import Any

import httpx
from PIL import ImageFile

from app.errors import UpstreamUnavailableError

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 10.0
RETRY_DELAY_SECONDS = 0.5
RETRYABLE_STATUS = frozenset({429, 500, 502, 503, 504})
# Human-readable names for error messages. The envelope keeps the short source id.
SOURCE_LABELS = {
    "weather": "Weather data",
    "air-quality": "Air quality data",
    "geocoding": "City search",
    "iss": "ISS position data",
    "passes": "Pass times",
    "apod": "NASA APOD",
}


def _label(source: str) -> str:
    return SOURCE_LABELS.get(source, source)


USER_AGENT = "SkyWatchDashboard/0.2 (+https://github.com/Snrboi/sky-watch-dashboard)"


class UpstreamClient:
    """One httpx client shared by every upstream call. Never prints, never reads keys."""

    def __init__(self, transport: httpx.BaseTransport | None = None) -> None:
        self._client = httpx.Client(
            timeout=httpx.Timeout(TIMEOUT_SECONDS),
            follow_redirects=True,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json, image/*;q=0.8",
            },
            transport=transport,
        )

    def close(self) -> None:
        self._client.close()

    def get_json(self, source: str, url: str, params: Mapping[str, Any] | None = None) -> Any:
        """GET a URL and return the decoded JSON body. Raises UpstreamUnavailableError."""
        response = self._get(source, url, params)
        try:
            return response.json()
        except ValueError as error:
            raise UpstreamUnavailableError(
                f"{_label(source)} sent a response that is not JSON.", source=source
            ) from error

    def image_size(
        self, source: str, url: str, *, max_bytes: int = 2_000_000
    ) -> tuple[int, int] | None:
        """Read only the image header and return (width, height).

        Returns None when the bytes are not a decodable image. Raises
        UpstreamUnavailableError when the download itself fails.
        """
        try:
            with self._client.stream("GET", url) as response:
                if response.status_code >= 400:
                    raise UpstreamUnavailableError(
                        f"{_label(source)} answered HTTP {response.status_code} for an image.",
                        source=source,
                    )
                parser = ImageFile.Parser()
                received = 0
                for chunk in response.iter_bytes(chunk_size=16_384):
                    received += len(chunk)
                    try:
                        parser.feed(chunk)
                    except Exception:  # noqa: BLE001 - Pillow raises many types on malformed data
                        return None
                    if parser.image is not None:
                        return parser.image.size
                    if received >= max_bytes:
                        return None
                return None
        except httpx.HTTPError as error:
            raise UpstreamUnavailableError(
                f"{_label(source)} image download failed ({type(error).__name__}).",
                source=source,
            ) from error

    def _get(self, source: str, url: str, params: Mapping[str, Any] | None) -> httpx.Response:
        problem = "no response"
        for attempt in (1, 2):
            try:
                response = self._client.get(url, params=params)
            except httpx.TimeoutException:
                problem = f"timed out after {TIMEOUT_SECONDS:.0f} s"
            except httpx.HTTPError as error:
                problem = f"connection failed ({type(error).__name__})"
            else:
                if response.status_code < 400:
                    return response
                problem = f"HTTP {response.status_code}"
                if response.status_code in (401, 403):
                    problem += ", the request was rejected; check the API key"
                if response.status_code not in RETRYABLE_STATUS:
                    break
            logger.warning("%s request failed on attempt %d: %s", source, attempt, problem)
            if attempt == 1:
                time.sleep(RETRY_DELAY_SECONDS)
        raise UpstreamUnavailableError(
            f"{_label(source)} is unavailable ({problem}).", source=source
        )
