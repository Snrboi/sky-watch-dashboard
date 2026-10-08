"""In-memory TTL cache with stale-if-error and short negative caching.

- A fresh value is served without touching the upstream.
- If the upstream fails and an older value exists, that value is served with stale=True.
- If the upstream fails and nothing is cached, the failure itself is remembered for a
  few seconds, so a dead upstream is not hammered by every visitor.
"""

import logging
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Generic, TypeVar

from app.errors import UpstreamUnavailableError

logger = logging.getLogger(__name__)
T = TypeVar("T")
NEGATIVE_TTL_CAP_SECONDS = 15.0


@dataclass(frozen=True)
class Cached(Generic[T]):
    value: T
    fetched_at: datetime
    stale: bool


@dataclass
class _Entry:
    value: Any
    fetched_at: datetime
    expires_at: float


@dataclass
class _Failure:
    message: str
    source: str
    expires_at: float


class TTLCache:
    def __init__(
        self,
        clock: Callable[[], float] = time.monotonic,
        now: Callable[[], datetime] = lambda: datetime.now(UTC),
        max_entries: int = 2000,
    ) -> None:
        self._clock = clock
        self._now = now
        self._max_entries = max_entries
        self._values: dict[str, _Entry] = {}
        self._failures: dict[str, _Failure] = {}
        self._locks: dict[str, threading.Lock] = {}
        self._guard = threading.Lock()

    def get_or_fetch(self, key: str, ttl: float, fetch: Callable[[], T]) -> Cached[T]:
        fresh = self._fresh(key)
        if fresh is not None:
            return fresh
        with self._lock_for(key):
            fresh = self._fresh(key)
            if fresh is not None:
                return fresh
            now = self._clock()
            previous = self._values.get(key)
            failure = self._failures.get(key)
            if failure is not None and failure.expires_at > now:
                if previous is not None:
                    return Cached(previous.value, previous.fetched_at, stale=True)
                raise UpstreamUnavailableError(failure.message, source=failure.source)
            try:
                value = fetch()
            except UpstreamUnavailableError as error:
                if previous is not None:
                    logger.warning(
                        "Serving stale %s after upstream failure: %s",
                        key,
                        error.message,
                    )
                    return Cached(previous.value, previous.fetched_at, stale=True)
                self._failures[key] = _Failure(
                    error.message,
                    error.source,
                    expires_at=now + min(ttl, NEGATIVE_TTL_CAP_SECONDS),
                )
                raise
            fetched_at = self._now()
            self._values.pop(key, None)  # re-insert so the newest entry is last
            self._values[key] = _Entry(value, fetched_at, expires_at=self._clock() + ttl)
            self._failures.pop(key, None)
            self._trim()
            return Cached(value, fetched_at, stale=False)

    def _fresh(self, key: str) -> "Cached[Any] | None":
        entry = self._values.get(key)
        if entry is not None and entry.expires_at > self._clock():
            return Cached(entry.value, entry.fetched_at, stale=False)
        return None

    def _trim(self) -> None:
        """Keep memory bounded: drop expired entries first, then the oldest, then idle locks."""
        with self._guard:
            if len(self._values) > self._max_entries:
                now = self._clock()
                for key in [k for k, e in self._values.items() if e.expires_at <= now]:
                    del self._values[key]
                while len(self._values) > self._max_entries:
                    del self._values[next(iter(self._values))]
            if len(self._failures) > self._max_entries:
                for key in list(self._failures)[: len(self._failures) - self._max_entries]:
                    del self._failures[key]
            for key in [k for k, lock in self._locks.items() if not lock.locked()]:
                if key not in self._values and key not in self._failures:
                    del self._locks[key]

    def _lock_for(self, key: str) -> threading.Lock:
        with self._guard:
            return self._locks.setdefault(key, threading.Lock())
