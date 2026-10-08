"""Build the land raster the API uses for region labels.

Run this once on a machine with about 1.5 GB free memory, then commit the output:

    cd backend && .venv/bin/python scripts/build_land_mask.py

It samples the global-land-mask package (1 km data) on a 0.25 degree grid and stores one
bit per cell, packed and zlib-compressed. The API then needs no numpy and no 1 GB array:
about 130 KB decompressed, and accurate to roughly 28 km, which is enough for labels that
say "Roughly over ...".
"""

import sys
import zlib
from pathlib import Path

import numpy as np
from global_land_mask import globe

BACKEND_DIR = Path(__file__).resolve().parents[1]
OUTPUT = BACKEND_DIR / "app" / "data" / "land_mask_quarter_degree.bin.zlib"
CELL_DEG = 0.25
ROWS = round(180 / CELL_DEG)  # 720, latitude from +90 down to -90
COLS = round(360 / CELL_DEG)  # 1440, longitude from -180 up to +180


def main() -> None:
    lat_centers = 90 - (np.arange(ROWS) + 0.5) * CELL_DEG
    lon_centers = -180 + (np.arange(COLS) + 0.5) * CELL_DEG
    lat_grid, lon_grid = np.meshgrid(lat_centers, lon_centers, indexing="ij")
    land = np.asarray(globe.is_land(lat_grid, lon_grid), dtype=bool)
    packed = np.packbits(land.ravel(), bitorder="big").tobytes()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(zlib.compress(packed, level=9))
    land_share = land.mean() * 100
    sys.stdout.write(
        f"Wrote {OUTPUT.relative_to(BACKEND_DIR)}: {ROWS}x{COLS} cells, "
        f"{len(packed)} bytes packed, {OUTPUT.stat().st_size} bytes compressed, "
        f"{land_share:.1f}% land.\n"
    )


if __name__ == "__main__":
    main()
