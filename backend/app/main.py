"""FastAPI app factory: routers, error handlers, optional dev CORS, and shutdown cleanup.

Importing this module creates the app object and reads settings. It makes no network calls.
"""

import logging
import threading
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.cache import TTLCache
from app.config import Settings, get_settings
from app.deps import AppContext
from app.errors import register_exception_handlers
from app.routes import api_router
from app.storage import JsonHistoryRepository
from app.upstream import UpstreamClient


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    logging.basicConfig(
        level=settings.log_level.upper(),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    logging.getLogger("httpx").setLevel(logging.WARNING)  # one line per upstream call is noise
    ctx = AppContext(
        settings=settings,
        http=UpstreamClient(),
        cache=TTLCache(),
        history=JsonHistoryRepository(settings.history_path),
        lookup_lock=threading.Lock(),
    )

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        yield
        ctx.http.close()

    app = FastAPI(
        title="Sky Watch API",
        version=__version__,
        summary="Weather, air quality, the ISS, and NASA's picture of the day.",
        lifespan=lifespan,
    )
    app.state.ctx = ctx
    if settings.cors_origin_list:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origin_list,
            allow_methods=["GET", "POST"],
            allow_headers=["Content-Type", "X-Client-Id"],
        )
    register_exception_handlers(app)
    app.include_router(api_router, prefix="/api")
    return app


app = create_app()
