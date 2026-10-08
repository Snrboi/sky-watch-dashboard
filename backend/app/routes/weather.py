from fastapi import APIRouter

from app.deps import CtxDep, LatQuery, LonQuery
from app.schemas import Weather
from app.services import weather as weather_service

router = APIRouter(tags=["weather"])


@router.get("/weather", response_model=Weather, summary="Current weather at a place")
def current_weather(ctx: CtxDep, lat: LatQuery, lon: LonQuery) -> Weather:
    cached = weather_service.get_weather(ctx, lat, lon)
    return Weather(**cached.value, fetched_at=cached.fetched_at, stale=cached.stale)
