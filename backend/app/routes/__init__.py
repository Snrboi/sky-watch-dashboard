"""HTTP routes. Each module validates input, calls one service, and returns a schema."""

from fastapi import APIRouter

from app.routes import air_quality, apod, geocode, health, history, iss, weather

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(geocode.router)
api_router.include_router(weather.router)
api_router.include_router(air_quality.router)
api_router.include_router(iss.router)
api_router.include_router(apod.router)
api_router.include_router(history.router)
