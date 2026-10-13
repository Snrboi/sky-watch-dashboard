"""PostgreSQL history repository. Used when DATABASE_URL is set.

The JSON file and this class implement the same two methods (see app/storage.py),
so services and routes never learn where the rows live. Swapping DATABASE_URL in or
out is the whole change.

Sync by design: every route in this app is a sync `def`, so FastAPI already runs it
in a worker thread, and psycopg's sync driver is simpler than the async one here.

No connection is opened at import time or at startup. The pool opens on the first
request that needs history, and the table is created then too (CREATE TABLE IF NOT
EXISTS, once per process). If the database is down, the app still boots and only the
history endpoints report the problem.
"""

import logging
import threading
from collections.abc import Iterator, Mapping
from contextlib import contextmanager
from datetime import UTC, datetime
from typing import Any

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.errors import UpstreamUnavailableError

logger = logging.getLogger(__name__)

# One row per recorded lookup. Column names match the JSON record keys exactly.
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS lookups (
    id           TEXT PRIMARY KEY,
    client_id    TEXT NOT NULL,
    recorded_at  TIMESTAMPTZ NOT NULL,
    city         TEXT NOT NULL,
    state        TEXT,
    country      TEXT NOT NULL DEFAULT '',
    lat          DOUBLE PRECISION NOT NULL,
    lon          DOUBLE PRECISION NOT NULL,
    temp_c       DOUBLE PRECISION,
    aqi          INTEGER,
    next_pass_at TIMESTAMPTZ
)
"""

# Every read is filtered by client_id and sorted by time, so one index covers it.
INDEX_SQL = """
CREATE INDEX IF NOT EXISTS lookups_client_recorded_idx
    ON lookups (client_id, recorded_at DESC)
"""

# A single browser will never legitimately reach this, and it keeps a read bounded.
MAX_ROWS_PER_CLIENT = 2000

INSERT_SQL = """
INSERT INTO lookups (
    id, client_id, recorded_at, city, state, country, lat, lon, temp_c, aqi, next_pass_at
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
ON CONFLICT (id) DO NOTHING
"""

# Newest first in SQL so the row cap keeps the most recent records, then reversed
# in Python to match the JSON repository, which returns oldest first.
SELECT_SQL = """
SELECT id, client_id, recorded_at, city, state, country, lat, lon, temp_c, aqi, next_pass_at
FROM lookups
WHERE client_id = %s
ORDER BY recorded_at DESC, id DESC
LIMIT %s
"""


def _iso(value: datetime | None) -> str | None:
    """Aware UTC datetime to ISO 8601, the shape the JSON records use."""
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat()


def _as_datetime(value: Any) -> datetime | None:
    """ISO 8601 string or datetime to an aware datetime. None when unusable."""
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        return None
    return parsed.astimezone(UTC) if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def row_to_record(row: Mapping[str, Any]) -> dict[str, Any]:
    """A database row as the dict shape the rest of the app already expects.

    Timestamps come back as ISO strings, not datetimes, because that is what the
    JSON repository returns and what app/services/stats.py parses.
    """
    return {
        "id": str(row["id"]),
        "client_id": str(row["client_id"]),
        "recorded_at": _iso(row["recorded_at"]) or "",
        "city": str(row["city"]),
        "state": row["state"],
        "country": row["country"] or "",
        "lat": float(row["lat"]),
        "lon": float(row["lon"]),
        "temp_c": None if row["temp_c"] is None else float(row["temp_c"]),
        "aqi": None if row["aqi"] is None else int(row["aqi"]),
        "next_pass_at": _iso(row["next_pass_at"]),
    }


class PostgresHistoryRepository:
    """The same contract as JsonHistoryRepository, backed by a database."""

    def __init__(self, database_url: str, *, max_size: int = 4) -> None:
        self.database_url = database_url
        self._pool = ConnectionPool(
            conninfo=database_url,
            min_size=1,
            max_size=max_size,
            # A request waits this long for a connection before giving up. Without a cap
            # the pool's own 30 s default turns a dead database into a 30 s hang.
            timeout=5.0,
            # Aiven closes idle connections, so recycle ours before it does, and ping a
            # connection before handing it out in case the server closed it anyway.
            max_idle=120.0,
            check=ConnectionPool.check_connection,
            kwargs={"row_factory": dict_row},
            open=False,  # opened on first use, never at import or startup
            name="sky-watch-history",
        )
        self._ready = False
        self._ready_lock = threading.Lock()

    # -- contract -----------------------------------------------------------

    def add(self, record: dict[str, Any]) -> None:
        recorded_at = _as_datetime(record.get("recorded_at"))
        if recorded_at is None:
            raise ValueError("recorded_at must be an ISO 8601 string or a datetime")
        params = (
            str(record["id"]),
            str(record["client_id"]),
            recorded_at,
            str(record["city"]),
            record.get("state") or None,
            record.get("country") or "",
            float(record["lat"]),
            float(record["lon"]),
            None if record.get("temp_c") is None else float(record["temp_c"]),
            None if record.get("aqi") is None else int(record["aqi"]),
            _as_datetime(record.get("next_pass_at")),
        )
        with self._connect() as connection:
            connection.execute(INSERT_SQL, params)

    def list_for_client(self, client_id: str) -> list[dict[str, Any]]:
        """Records for one browser, oldest first. Same shape as the JSON version."""
        if not client_id:
            return []
        with self._connect() as connection:
            rows = connection.execute(SELECT_SQL, (client_id, MAX_ROWS_PER_CLIENT)).fetchall()
        return [row_to_record(row) for row in reversed(rows)]

    def close(self) -> None:
        if self._pool.closed:
            return
        self._pool.close()
        self._ready = False

    def count_records(self) -> int:
        """Total rows in the table. Used by the migration script and quick checks."""
        with self._connect() as connection:
            row = connection.execute("SELECT count(*) AS total FROM lookups").fetchone()
        return int(row["total"])

    # -- internals ----------------------------------------------------------

    def ensure_schema(self) -> None:
        """Create the table and index if they are missing. Safe to run repeatedly.

        Also used by scripts/migrate_history_to_postgres.py before it copies rows.
        """
        self._pool.open()  # no-op when the pool is already open
        try:
            with self._pool.connection() as connection:
                connection.execute(SCHEMA_SQL)
                connection.execute(INDEX_SQL)
        except psycopg.Error as error:
            raise self._unavailable(error) from error

    @contextmanager
    def _connect(self) -> Iterator[psycopg.Connection]:
        """Open the pool, prepare the schema once per process, then hand out a connection.

        The connection is acquired inside this try, not in the caller: `pool.connection()`
        only waits for a connection when it is entered, so wrapping it here is what turns a
        dead database into a 503 instead of a 500 with a stack trace.
        """
        self._check_ready()
        try:
            with self._pool.connection() as connection:
                yield connection
        except psycopg.Error as error:
            raise self._unavailable(error) from error

    def _check_ready(self) -> None:
        if self._ready:
            return
        with self._ready_lock:
            if self._ready:
                return
            self.ensure_schema()
            self._ready = True
            logger.info("History is stored in PostgreSQL")

    @staticmethod
    def _unavailable(error: Exception) -> UpstreamUnavailableError:
        logger.error("History database error: %s", error)
        return UpstreamUnavailableError(
            "The history database could not be reached. Lookups are not being saved.",
            source="database",
        )
