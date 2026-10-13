"""Copy history.json into PostgreSQL once, after DATABASE_URL is set.

Safe to re-run: rows whose id is already there are skipped, so nothing is duplicated.
The JSON file itself is left alone, so it stays as a backup.

Run from backend/:

    cd backend && uv run python scripts/migrate_history_to_postgres.py
        Reads the file, prints how many records it holds, and connects to nothing.

    cd backend && uv run python scripts/migrate_history_to_postgres.py --apply
        Creates the table if it is missing and copies the records in.

    cd backend && uv run python scripts/migrate_history_to_postgres.py \
        --apply --path data/history.json
        Same, with an explicit file. Relative paths resolve from backend/.
"""

import argparse
import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.config import Settings  # noqa: E402
from app.storage_postgres import PostgresHistoryRepository  # noqa: E402


def load_records(path: Path) -> list[dict]:
    if not path.is_file():
        print(f"No history file at {path}. Nothing to migrate.")
        return []
    raw = path.read_text(encoding="utf-8").strip()
    if not raw:
        print(f"{path} is empty. Nothing to migrate.")
        return []
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as error:
        print(f"{path} is not valid JSON ({error}). Aborting.")
        return []
    if not isinstance(data, list):
        print(f"{path} does not hold a JSON array. Aborting.")
        return []
    records = [item for item in data if isinstance(item, dict) and item.get("id")]
    skipped = len(data) - len(records)
    if skipped:
        print(f"Ignoring {skipped} entry/entries without an id.")
    return records


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--path",
        type=Path,
        default=None,
        help="History JSON file. Defaults to HISTORY_PATH, then backend/data/history.json.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Actually write to the database. Without it, this is a dry run.",
    )
    args = parser.parse_args()

    settings = Settings()
    path = args.path or settings.history_path
    if not path.is_absolute():
        path = BACKEND_DIR / path

    records = load_records(path)
    print(f"File: {path}")
    print(f"Records in the file: {len(records)}")
    if not records or not args.apply:
        if records:
            print("Dry run. Re-run with --apply to copy them.")
        return 0

    if not settings.database_url:
        print("DATABASE_URL is not set (backend/.env or the environment). Nothing to write to.")
        return 1

    repository = PostgresHistoryRepository(
        settings.database_url, max_size=settings.db_pool_max_size
    )
    try:
        before = repository.count_records()
        for record in records:
            repository.add(record)
        after = repository.count_records()
    finally:
        repository.close()

    copied = after - before
    print(f"Rows in lookups before: {before}")
    print(f"Rows after: {after}")
    print(f"Copied: {copied}. Already there: {len(records) - copied}.")
    print("The JSON file was not modified.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
