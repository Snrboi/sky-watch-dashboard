"""Write the API's OpenAPI schema to backend/openapi.json.

The frontend generates its TypeScript types from this file. Run it after any schema change:

    cd backend && .venv/bin/python scripts/export_openapi.py
"""

import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.main import create_app  # noqa: E402


def main() -> None:
    schema = create_app().openapi()
    output = BACKEND_DIR / "openapi.json"
    output.write_text(json.dumps(schema, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    sys.stdout.write(f"Wrote {output.relative_to(BACKEND_DIR.parent)}\n")


if __name__ == "__main__":
    main()
