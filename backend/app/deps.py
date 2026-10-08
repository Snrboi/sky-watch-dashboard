"""Request-scoped dependencies: the shared context, and the per-browser client ID."""

import re
import threading
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, Query, Request

from app.cache import TTLCache
from app.config import Settings
from app.errors import BadRequestError
from app.storage import HistoryRepository
from app.upstream import UpstreamClient

CLIENT_ID_PATTERN = re.compile(r"[A-Za-z0-9_-]{8,64}")


@dataclass
class AppContext:
    """Everything a service needs. Created once in create_app()."""

    settings: Settings
    http: UpstreamClient
    cache: TTLCache
    history: HistoryRepository
    lookup_lock: threading.Lock


def get_context(request: Request) -> AppContext:
    return request.app.state.ctx


def get_client_id(
    x_client_id: Annotated[str | None, Header(description="Random per-browser ID.")] = None,
) -> str:
    if not x_client_id or not CLIENT_ID_PATTERN.fullmatch(x_client_id):
        raise BadRequestError(
            "The X-Client-Id header is required: 8 to 64 letters, digits, '-' or '_'."
        )
    return x_client_id


CtxDep = Annotated[AppContext, Depends(get_context)]
ClientIdDep = Annotated[str, Depends(get_client_id)]
LatQuery = Annotated[float, Query(ge=-90, le=90, description="Latitude in degrees.")]
LonQuery = Annotated[float, Query(ge=-180, le=180, description="Longitude in degrees.")]
