from typing import Annotated

from fastapi import APIRouter, Query

from app.deps import CtxDep, LatQuery, LonQuery
from app.errors import BadRequestError
from app.schemas import GeocodeResponse, Place
from app.services import geocoding

router = APIRouter(tags=["geocode"])


@router.get("/geocode", response_model=GeocodeResponse, summary="Search for a city")
def geocode(
    ctx: CtxDep,
    q: Annotated[
        str,
        Query(max_length=100, description="City name, optionally with a state or country."),
    ],
    limit: Annotated[int, Query(ge=1, le=5, description="Maximum number of matches.")] = 5,
) -> GeocodeResponse:
    query = " ".join(q.split())
    if len(query) < 2:
        raise BadRequestError("Enter at least 2 characters to search.")
    cached = geocoding.search_places(ctx, query, limit)
    return GeocodeResponse(
        query=query,
        results=[Place(**item) for item in cached.value],
        fetched_at=cached.fetched_at,
        stale=cached.stale,
    )


@router.get(
    "/geocode/reverse",
    response_model=GeocodeResponse,
    summary="The nearest named place for coordinates",
)
def reverse_geocode(ctx: CtxDep, lat: LatQuery, lon: LonQuery) -> GeocodeResponse:
    cached = geocoding.reverse_geocode(ctx, lat, lon)
    results = [Place(**cached.value)] if cached.value is not None else []
    return GeocodeResponse(
        query=f"{lat}, {lon}",
        results=results,
        fetched_at=cached.fetched_at,
        stale=cached.stale,
    )
