from typing import Annotated

from fastapi import APIRouter, Query

from app.deps import CtxDep, LatQuery, LonQuery
from app.errors import BadRequestError
from app.schemas import IssPosition, PassList
from app.services import iss_passes as iss_passes_service
from app.services import iss_position as iss_position_service
from app.services.common import utc_now

router = APIRouter(prefix="/iss", tags=["iss"])


@router.get("/position", response_model=IssPosition, summary="Live ISS position")
def iss_position(
    ctx: CtxDep,
    lat: Annotated[
        float | None, Query(ge=-90, le=90, description="Optional place latitude.")
    ] = None,
    lon: Annotated[
        float | None, Query(ge=-180, le=180, description="Optional place longitude.")
    ] = None,
) -> IssPosition:
    if (lat is None) != (lon is None):
        raise BadRequestError("Send both lat and lon, or neither.")
    cached = iss_position_service.get_position(ctx)
    view = iss_position_service.describe_position(cached.value, lat, lon)
    return IssPosition(**view, fetched_at=cached.fetched_at, stale=cached.stale)


@router.get("/passes", response_model=PassList, summary="Next visible ISS passes")
def iss_passes(
    ctx: CtxDep,
    lat: LatQuery,
    lon: LonQuery,
    limit: Annotated[int, Query(ge=1, le=5, description="Maximum number of passes.")] = 5,
) -> PassList:
    cached = iss_passes_service.get_passes(ctx, lat, lon, now=utc_now(), limit=limit)
    return PassList(**cached.value, fetched_at=cached.fetched_at, stale=cached.stale)
