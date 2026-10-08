from fastapi import APIRouter

from app import __version__
from app.schemas import Health
from app.services.common import utc_now

router = APIRouter(tags=["health"])


@router.get("/health", response_model=Health, summary="Service status")
def health() -> Health:
    return Health(status="ok", version=__version__, time=utc_now())
