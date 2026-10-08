"""History repository. The JSON file is the only implementation today.

A database later means a second class with the same two methods. Routes and services
never touch the file directly.
"""

import contextlib
import json
import logging
import os
import tempfile
import threading
from pathlib import Path
from typing import Any, Protocol

logger = logging.getLogger(__name__)


class HistoryRepository(Protocol):
    def add(self, record: dict[str, Any]) -> None: ...

    def list_for_client(self, client_id: str) -> list[dict[str, Any]]: ...


class JsonHistoryRepository:
    """All records in one JSON array. Writes are atomic: temp file, fsync, then os.replace."""

    def __init__(self, path: Path) -> None:
        self.path = path
        self._lock = threading.RLock()

    def add(self, record: dict[str, Any]) -> None:
        with self._lock:
            records = self._read()
            records.append(record)
            self._write(records)

    def list_for_client(self, client_id: str) -> list[dict[str, Any]]:
        """Records for one browser, oldest first."""
        with self._lock:
            return [record for record in self._read() if record.get("client_id") == client_id]

    def _read(self) -> list[dict[str, Any]]:
        try:
            raw = self.path.read_text(encoding="utf-8")
        except FileNotFoundError:
            return []
        if not raw.strip():
            return []
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            backup = self.path.with_name(f"{self.path.name}.corrupt")
            logger.error("History file %s is not valid JSON; moved to %s", self.path, backup)
            os.replace(self.path, backup)
            return []
        if not isinstance(data, list):
            return []
        return [item for item in data if isinstance(item, dict)]

    def _write(self, records: list[dict[str, Any]]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        descriptor, temp_name = tempfile.mkstemp(
            dir=self.path.parent, prefix=f".{self.path.name}.", suffix=".tmp"
        )
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
                json.dump(records, handle, indent=2, ensure_ascii=False)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(temp_name, self.path)
        except BaseException:
            with contextlib.suppress(FileNotFoundError):
                os.unlink(temp_name)
            raise
