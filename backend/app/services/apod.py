"""NASA Astronomy Picture of the Day: entries, placeholder detection, and the background choice."""

import json
import logging
import re
from datetime import date, timedelta
from html import unescape
from typing import TYPE_CHECKING, Any

from app.cache import Cached
from app.errors import UpstreamUnavailableError
from app.services.common import utc_now

if TYPE_CHECKING:
    from app.deps import AppContext

logger = logging.getLogger(__name__)

SOURCE = "apod"
APOD_URL = "https://api.nasa.gov/planetary/apod"
# NASA moved its APOD pages to science.nasa.gov, and the JSON API above has been answering
# with the NASA logo instead of the picture, and the same explanation text for every date
# (every day tested on 2026-10-12 and 2026-10-13, which is why the dashboard showed the
# generated night sky and the Photo page repeated today's text). This page carries the real
# picture, the day's own explanation, and a link to the article, addressable by date:
# ?date=YYYY-MM-DD.
SCIENCE_PAGE_URL = "https://science.nasa.gov/apod/"
HTML_HEADERS = {"Accept": "text/html,application/xhtml+xml"}
SCIENCE_ARTICLE_TYPE = "NewsArticle"
SCIENCE_ARTICLE_SECTION = "APOD"
ASSET_HOST = "assets.science.nasa.gov"
ASSET_WIDTH = 1600
MAX_ASSET_WIDTH = 2400
EARLIEST_DATE = date(1995, 6, 16)
TODAY_TTL_SECONDS = 3600
RANDOM_TTL_SECONDS = 300
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
LD_JSON_BLOCK = re.compile(r"<script[^>]*application/ld\+json[^>]*>(.*?)</script>", re.DOTALL)
PAGE_DESCRIPTION_BLOCK = re.compile(
    r"<p[^>]*media-detail-hero__description[^>]*>(.*?)</p>", re.DOTALL | re.IGNORECASE
)
EXPLANATION_LABEL = re.compile(r"^\s*Explanation:\s*", re.IGNORECASE)
TOMORROW_MARKER = "Tomorrow's picture:"
HEADLINE_PREFIX = re.compile(r"^\s*APOD:\s*\d{4}\s+\w+\s+\d{1,2}\s*[-\u2013\u2014]\s*")


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
        entry = _entry_from_api(data, today)
        entry["date"] = entry_date
        if entry["is_placeholder"]:
            _use_nasa_page(ctx, entry)
        return entry

    return ctx.cache.get_or_fetch(f"apod:{day or 'latest'}", ttl, fetch)


def get_random(ctx: "AppContext", today: date) -> Cached[dict[str, Any]]:
    """One photo chosen by NASA, via the count parameter.

    The random entry is rebuilt every few minutes, so repeated requests can
    return different pictures without hammering the API.
    """

    def fetch() -> dict[str, Any]:
        data = ctx.http.get_json(
            SOURCE, APOD_URL, {"api_key": ctx.settings.nasa_api_key, "count": "1"}
        )
        items = data if isinstance(data, list) else []
        if not items or not isinstance(items[0], dict):
            raise UpstreamUnavailableError("NASA APOD sent an unexpected response.", source=SOURCE)
        entry = _entry_from_api(items[0], today)
        if entry["is_placeholder"]:
            _use_nasa_page(ctx, entry)
        return entry

    return ctx.cache.get_or_fetch("apod:random", RANDOM_TTL_SECONDS, fetch)


def _entry_from_api(data: dict[str, Any], today: date) -> dict[str, Any]:
    """The shared shape of one APOD entry, straight from the JSON API."""
    entry_date = str(data.get("date") or today.isoformat())
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


def _use_nasa_page(ctx: "AppContext", entry: dict[str, Any]) -> None:
    """Fill in the picture and the text from NASA's APOD page.

    The JSON API ignores the date for everything except the date field itself: it answers with
    its logo, the title "NASA Science", and the same explanation on every date. The page has
    the real picture and the day's own explanation.

    Nothing is raised here. If the page cannot be read or holds no picture, the entry keeps
    the placeholder flag, and the caller falls back to the generated background as before.
    """
    day = str(entry["date"])
    try:
        html = ctx.http.get_text(SOURCE, SCIENCE_PAGE_URL, {"date": day}, headers=HTML_HEADERS)
    except UpstreamUnavailableError as error:
        logger.info("APOD page could not be read for %s: %s", day, error.message)
        return
    details = _details_from_page(html)
    if details is None:
        logger.info("No picture found on NASA's APOD page for %s", day)
        return
    entry["url"] = details["image_url"] or entry["url"]
    entry["hdurl"] = None
    entry["title"] = details["title"] or entry["title"]
    entry["page_url"] = details["page_url"] or entry["page_url"]
    if details["explanation"]:
        entry["explanation"] = details["explanation"]
    entry["is_placeholder"] = False
    logger.info("APOD picture and text for %s came from NASA's page, not the JSON API", day)


def _details_from_page(html: str) -> dict[str, str | None] | None:
    """Picture URL, article URL, title, and explanation from NASA's page. None when no picture."""
    for block in LD_JSON_BLOCK.findall(html):
        try:
            data = json.loads(block)
        except ValueError:
            continue
        if not isinstance(data, dict) or data.get("@type") != SCIENCE_ARTICLE_TYPE:
            continue
        if str(data.get("articleSection") or "").upper() != SCIENCE_ARTICLE_SECTION:
            continue
        image = data.get("image")
        url = image.get("url") if isinstance(image, dict) else None
        if not isinstance(url, str) or not url.startswith("https://"):
            continue
        article = data.get("url")
        return {
            "image_url": sized_asset_url(url),
            "page_url": article if isinstance(article, str) else None,
            "title": _clean_headline(str(data.get("headline") or "")),
            "explanation": _explanation_from_page(html),
        }
    return None


def _explanation_from_page(html: str) -> str | None:
    """The day's own explanation paragraph, without its "Explanation:" label.

    Inline tags are removed without adding spaces, so links and emphasis stay inside their
    sentence. Line breaks become spaces. NASA appends "Tomorrow's picture:" to the same
    paragraph, and that tail is dropped.
    """
    match = PAGE_DESCRIPTION_BLOCK.search(html)
    if match is None:
        return None
    text = re.sub(r"<br\s*/?>", " ", match.group(1), flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = " ".join(unescape(text).split())
    text = EXPLANATION_LABEL.sub("", text)
    marker = text.find(TOMORROW_MARKER)
    if marker != -1:
        text = text[:marker].strip()
    return text or None


def sized_asset_url(url: str) -> str:
    """Ask NASA's asset service for a sensibly sized copy.

    `w=0` means "original size", which can be narrower than the background rule's 1000 px
    minimum (2026-10-12's is 993 px), or far wider than a background needs (2026-10-05's is
    4222 px). Both become 1600. A width already in range is left alone, and any other host
    is returned untouched.
    """
    if ASSET_HOST not in url:
        return url
    match = re.search(r"w=(\d+)", url)
    if match is None:
        separator = "&" if "?" in url else "?"
        return f"{url}{separator}w={ASSET_WIDTH}&fit=clip"
    width = int(match.group(1))
    if width == 0 or width > MAX_ASSET_WIDTH:
        return url[: match.start()] + f"w={ASSET_WIDTH}" + url[match.end() :]
    return url


def _clean_headline(headline: str) -> str | None:
    """'APOD: 2026 October 11 - Ice Fishing for Cosmic Neutrinos' to the title alone."""
    cleaned = HEADLINE_PREFIX.sub("", unescape(headline)).strip()
    return cleaned or None


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
