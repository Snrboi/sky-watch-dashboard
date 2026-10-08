from fastapi import APIRouter

from app.deps import CtxDep, LatQuery, LonQuery
from app.schemas import AirQuality
from app.services import air_quality as air_quality_service

router = APIRouter(tags=["air-quality"])


@router.get("/air-quality", response_model=AirQuality, summary="Air quality at a place")
def air_quality(ctx: CtxDep, lat: LatQuery, lon: LonQuery) -> AirQuality:
    cached = air_quality_service.get_air_quality(ctx, lat, lon)
    return AirQuality(**cached.value, fetched_at=cached.fetched_at, stale=cached.stale)
