from fastapi import APIRouter

from app import __version__
from app.deps import CtxDep
from app.schemas import Health
from app.services.common import utc_now

router = APIRouter(tags=["health"])


@router.get("/health", response_model=Health, summary="Service status")
def health(ctx: CtxDep) -> Health:
    return Health(
        status="ok",
        version=__version__,
        time=utc_now(),
        history_backend=ctx.settings.history_backend,
    )
