"""NASA Astronomy Picture of the Day: entries, placeholder detection, and the background choice."""

import re
from datetime import date, timedelta
from typing import TYPE_CHECKING, Any

from app.cache import Cached
from app.errors import UpstreamUnavailableError
from app.services.common import utc_now

if TYPE_CHECKING:
    from app.deps import AppContext

SOURCE = "apod"
APOD_URL = "https://api.nasa.gov/planetary/apod"
EARLIEST_DATE = date(1995, 6, 16)
TODAY_TTL_SECONDS = 3600
PAST_TTL_SECONDS = 86400
IMAGE_SIZE_TTL_SECONDS = 86400
BACKGROUND_TTL_SECONDS = 3600
MIN_BACKGROUND_WIDTH = 1000
LOOKBACK_DAYS = 7
PLACEHOLDER_URL_MARKER = "nasa-logo"
PLACEHOLDER_TITLE = "NASA Science"
FALLBACK_IMAGE_URL = "/fallback/night-sky.jpg"
FALLBACK_CREDIT = "Generated background"
DATE_PATTERN = re.compile(r"\d{4}-\d{2}-\d{2}")


def page_url(day: str) -> str:
    """Link to NASA's page for a date, for example ap241008.html."""
    if not DATE_PATTERN.fullmatch(day):
        return "https://apod.nasa.gov/apod/"
    return f"https://apod.nasa.gov/apod/ap{day[2:4]}{day[5:7]}{day[8:10]}.html"


def is_placeholder(url: str | None, title: str | None) -> bool:
    """NASA's logo stands in for a picture on some dates. These are its tell-tale signs."""
    return PLACEHOLDER_URL_MARKER in (url or "") or (title or "").strip() == PLACEHOLDER_TITLE


def get_apod(ctx: "AppContext", day: str | None, today: date) -> Cached[dict[str, Any]]:
    is_past = day is not None and day < today.isoformat()
    ttl = PAST_TTL_SECONDS if is_past else TODAY_TTL_SECONDS
    params: dict[str, str] = {"api_key": ctx.settings.nasa_api_key}
    if day is not None:
        params["date"] = day

    def fetch() -> dict[str, Any]:
        data = ctx.http.get_json(SOURCE, APOD_URL, params)
        if not isinstance(data, dict):
            raise UpstreamUnavailableError("NASA APOD sent an unexpected response.", source=SOURCE)
        entry_date = str(data.get("date") or day or today.isoformat())
        title = str(data.get("title") or "Untitled")
        url = str(data["url"]) if data.get("url") else None
        hdurl = str(data["hdurl"]) if data.get("hdurl") else None
        return {
            "date": entry_date,
            "title": title,
            "explanation": str(data.get("explanation") or ""),
            "media_type": str(data.get("media_type") or "image"),
            "url": url,
            "hdurl": hdurl,
            "copyright": _clean_credit(data.get("copyright")),
            "page_url": page_url(entry_date),
            "is_placeholder": is_placeholder(url, title),
        }

    return ctx.cache.get_or_fetch(f"apod:{day or 'latest'}", ttl, fetch)


def get_background(ctx: "AppContext", today: date) -> Cached[dict[str, Any]]:
    """The background image, following the rules in PRD section 8.8.

    An upstream outage is not cached as a fallback, so the next request tries again.
    """
    try:
        return ctx.cache.get_or_fetch(
            "apod:background",
            BACKGROUND_TTL_SECONDS,
            lambda: _choose_background(ctx, today),
        )
    except UpstreamUnavailableError as error:
        return Cached(
            value=_fallback(today, error.message),
            fetched_at=utc_now(),
            stale=False,
        )


def _choose_background(ctx: "AppContext", today: date) -> dict[str, Any]:
    latest = get_apod(ctx, None, today).value
    try:
        base_day = date.fromisoformat(str(latest["date"]))
    except ValueError:
        return _fallback(today, "NASA returned a date that could not be read")
    for offset in range(LOOKBACK_DAYS + 1):
        day = base_day - timedelta(days=offset)
        if day < EARLIEST_DATE:
            break
        entry = latest if offset == 0 else get_apod(ctx, day.isoformat(), today).value
        if entry["media_type"] != "image" or entry["is_placeholder"] or not entry["url"]:
            continue
        size = _image_size(ctx, entry["url"])
        if size is None or size[0] < MIN_BACKGROUND_WIDTH:
            continue
        hd_url = entry["hdurl"] if entry["hdurl"] and entry["hdurl"] != entry["url"] else None
        return {
            "date": entry["date"],
            "title": entry["title"],
            "image_url": entry["url"],
            "hd_url": hd_url,
            "credit": entry["copyright"] or "NASA APOD",
            "page_url": entry["page_url"],
            "is_fallback": False,
            "fallback_reason": None,
        }
    return _fallback(today, f"No valid NASA image in the last {LOOKBACK_DAYS} days")


def _image_size(ctx: "AppContext", url: str) -> tuple[int, int] | None:
    cached = ctx.cache.get_or_fetch(
        f"apod-size:{url}",
        IMAGE_SIZE_TTL_SECONDS,
        lambda: ctx.http.image_size(SOURCE, url),
    )
    return cached.value


def _fallback(today: date, reason: str) -> dict[str, Any]:
    return {
        "date": today.isoformat(),
        "title": "Night sky",
        "image_url": FALLBACK_IMAGE_URL,
        "hd_url": None,
        "credit": FALLBACK_CREDIT,
        "page_url": None,
        "is_fallback": True,
        "fallback_reason": reason,
    }


def _clean_credit(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    return " ".join(value.split()) or None
