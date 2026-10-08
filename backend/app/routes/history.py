from typing import Annotated

from fastapi import APIRouter, Query

from app.deps import ClientIdDep, CtxDep
from app.schemas import LookupEntry, LookupList, LookupRequest, LookupResult, Stats
from app.services import lookups as lookups_service
from app.services.common import utc_now

router = APIRouter(tags=["history"])


@router.post("/history", response_model=LookupResult, summary="Record a lookup for a place")
def record_lookup(ctx: CtxDep, client_id: ClientIdDep, body: LookupRequest) -> LookupResult:
    outcome = lookups_service.record_lookup(ctx, client_id, body.model_dump(), now=utc_now())
    return LookupResult(
        recorded=outcome.recorded,
        entry=LookupEntry(**outcome.entry),
        throttled_until=outcome.throttled_until,
    )


@router.get("/history", response_model=LookupList, summary="Past lookups, newest first")
def list_history(
    ctx: CtxDep,
    client_id: ClientIdDep,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    city: Annotated[str | None, Query(max_length=100, description="Only this city.")] = None,
) -> LookupList:
    entries = lookups_service.list_lookups(ctx, client_id, city=city, limit=limit)
    return LookupList(entries=[LookupEntry(**entry) for entry in entries])


@router.get("/history/stats", response_model=Stats, summary="Statistics over past lookups")
def history_stats(ctx: CtxDep, client_id: ClientIdDep) -> Stats:
    return Stats(**lookups_service.lookup_stats(ctx, client_id))
