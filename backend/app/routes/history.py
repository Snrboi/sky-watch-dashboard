import csv
import io
from typing import Annotated

from fastapi import APIRouter, Query
from fastapi.responses import PlainTextResponse

from app.deps import ClientIdDep, CtxDep
from app.schemas import LookupEntry, LookupList, LookupRequest, LookupResult, Stats
from app.services import lookups as lookups_service
from app.services.common import utc_now

router = APIRouter(tags=["history"])

CSV_FIELDS = (
    "recorded_at",
    "city",
    "state",
    "country",
    "lat",
    "lon",
    "temp_c",
    "aqi",
    "next_pass_at",
)


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


@router.delete(
    "/history",
    response_model=LookupList,
    summary="Delete this browser's lookups",
)
def delete_history(ctx: CtxDep, client_id: ClientIdDep) -> LookupList:
    lookups_service.delete_lookups(ctx, client_id)
    return LookupList(entries=[])


@router.get(
    "/history.csv",
    response_class=PlainTextResponse,
    summary="This browser's lookups as CSV, for a spreadsheet",
)
def history_csv(ctx: CtxDep, client_id: ClientIdDep) -> PlainTextResponse:
    entries = lookups_service.list_lookups(ctx, client_id, city=None, limit=2000)
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=CSV_FIELDS)
    writer.writeheader()
    for entry in entries:
        writer.writerow({field: entry.get(field) for field in CSV_FIELDS})
    return PlainTextResponse(
        buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="sky-watch-history.csv"'},
    )
