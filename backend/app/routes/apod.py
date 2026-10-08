from datetime import date
from typing import Annotated

from fastapi import APIRouter, Query

from app.deps import CtxDep
from app.errors import BadRequestError
from app.schemas import ApodEntry, Background
from app.services import apod as apod_service
from app.services.common import utc_now

router = APIRouter(tags=["apod"])


@router.get("/apod", response_model=ApodEntry, summary="NASA picture of the day")
def apod_entry(
    ctx: CtxDep,
    date_text: Annotated[
        str | None,
        Query(alias="date", max_length=10, description="YYYY-MM-DD. Defaults to today."),
    ] = None,
) -> ApodEntry:
    today = utc_now().date()
    day = _parse_day(date_text, today) if date_text is not None else None
    cached = apod_service.get_apod(ctx, day, today)
    return ApodEntry(**cached.value, fetched_at=cached.fetched_at, stale=cached.stale)


@router.get(
    "/apod/background",
    response_model=Background,
    summary="Background image for every page",
)
def apod_background(ctx: CtxDep) -> Background:
    cached = apod_service.get_background(ctx, utc_now().date())
    return Background(**cached.value, fetched_at=cached.fetched_at, stale=cached.stale)


def _parse_day(text: str, today: date) -> str:
    try:
        parsed = date.fromisoformat(text)
    except ValueError as error:
        raise BadRequestError("date must look like YYYY-MM-DD.") from error
    if parsed < apod_service.EARLIEST_DATE or parsed > today:
        raise BadRequestError(
            f"date must be between {apod_service.EARLIEST_DATE.isoformat()} and today."
        )
    return parsed.isoformat()
