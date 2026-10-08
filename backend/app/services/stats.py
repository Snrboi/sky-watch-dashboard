"""Statistics over lookup history. Pure: no I/O, and nulls are ignored instead of crashing."""

from collections.abc import Iterable, Mapping
from datetime import UTC, datetime
from typing import Any

from app.services.aqi import level_for


def parse_recorded(record: Mapping[str, Any]) -> datetime | None:
    """The record's recorded_at as an aware UTC datetime, or None if it is unusable."""
    value = record.get("recorded_at")
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed.astimezone(UTC) if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def compute_stats(records: Iterable[Mapping[str, Any]]) -> dict[str, Any]:
    usable: list[tuple[datetime, Mapping[str, Any]]] = []
    for record in records:
        when = parse_recorded(record)
        if when is not None:
            usable.append((when, record))
    usable.sort(key=lambda pair: pair[0])
    if not usable:
        return {
            "total_lookups": 0,
            "days_active": 0,
            "unique_cities": 0,
            "most_searched_city": None,
            "average_temp_c": None,
            "best_aqi": None,
            "worst_aqi": None,
            "lookups_with_pass": 0,
            "trend": [],
        }

    city_counts: dict[str, int] = {}
    city_labels: dict[str, str] = {}
    temps: list[float] = []
    best: tuple[int, datetime] | None = None
    worst: tuple[int, datetime] | None = None
    buckets: dict[str, dict[str, list[float]]] = {}
    lookups_with_pass = 0

    for when, record in usable:
        label = str(record.get("city") or "").strip()
        if label:
            key = label.casefold()
            city_counts[key] = city_counts.get(key, 0) + 1
            city_labels.setdefault(key, label)

        temp = _number(record.get("temp_c"))
        aqi = _aqi_value(record.get("aqi"))
        day = when.date().isoformat()
        bucket = buckets.setdefault(day, {"temp": [], "aqi": []})
        if temp is not None:
            temps.append(temp)
            bucket["temp"].append(temp)
        if aqi is not None:
            bucket["aqi"].append(float(aqi))
            # Strict comparisons keep the earliest occurrence of a tied value.
            if best is None or aqi < best[0]:
                best = (aqi, when)
            if worst is None or aqi > worst[0]:
                worst = (aqi, when)
        if record.get("next_pass_at"):
            lookups_with_pass += 1

    most_searched = None
    if city_counts:
        top_key = max(city_counts, key=lambda key: city_counts[key])
        most_searched = {"city": city_labels[top_key], "lookups": city_counts[top_key]}

    return {
        "total_lookups": len(usable),
        "days_active": len({when.date() for when, _ in usable}),
        "unique_cities": len(city_counts),
        "most_searched_city": most_searched,
        "average_temp_c": _mean(temps, 1),
        "best_aqi": _aqi_record(best),
        "worst_aqi": _aqi_record(worst),
        "lookups_with_pass": lookups_with_pass,
        "trend": [
            {
                "date": day,
                "avg_temp_c": _mean(bucket["temp"], 1),
                "avg_aqi": _mean(bucket["aqi"], 1),
            }
            for day, bucket in sorted(buckets.items())
        ],
    }


def _number(value: Any) -> float | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value)


def _aqi_value(value: Any) -> int | None:
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return value if level_for(value) is not None else None


def _mean(values: list[float], digits: int) -> float | None:
    if not values:
        return None
    return round(sum(values) / len(values), digits)


def _aqi_record(pair: tuple[int, datetime] | None) -> dict[str, Any] | None:
    if pair is None:
        return None
    aqi, when = pair
    level = level_for(aqi)
    return {
        "aqi": aqi,
        "label": level.label if level else str(aqi),
        "date": when.date().isoformat(),
    }
