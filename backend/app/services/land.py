"""Land or sea lookup from a 0.25 degree raster built by scripts/build_land_mask.py.

Pure Python with no numpy. The decompressed raster is about 130 KB. Accuracy is roughly 28 km,
which suits labels that say "Roughly over ...".
"""

import zlib
from functools import lru_cache
from pathlib import Path

DATA_FILE = Path(__file__).resolve().parents[1] / "data" / "land_mask_quarter_degree.bin.zlib"
CELL_DEG = 0.25
ROWS = 720  # latitude +90 down to -90
COLS = 1440  # longitude -180 up to +180


@lru_cache(maxsize=1)
def _packed_mask() -> bytes:
    return zlib.decompress(DATA_FILE.read_bytes())


def is_land(lat: float, lon: float) -> bool:
    """True when the cell containing (lat, lon) is land. Inputs are validated upstream."""
    row = min(max(int((90.0 - lat) / CELL_DEG), 0), ROWS - 1)
    col = min(max(int((lon + 180.0) / CELL_DEG), 0), COLS - 1)
    index = row * COLS + col
    return bool((_packed_mask()[index >> 3] >> (7 - (index & 7))) & 1)
