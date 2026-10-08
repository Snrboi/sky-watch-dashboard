"""The one AQI table: level, label, color token, and advice. API, history, and stats share it."""

from dataclasses import dataclass


@dataclass(frozen=True)
class AqiLevel:
    value: int
    label: str
    color: str  # token; the frontend maps it to classes in lib/aqi.ts
    advice: str


AQI_LEVELS: dict[int, AqiLevel] = {
    1: AqiLevel(1, "Good", "good", "Air quality is good. Enjoy your time outdoors!"),
    2: AqiLevel(
        2,
        "Fair",
        "fair",
        "Acceptable. Unusually sensitive people should keep outdoor exertion short.",
    ),
    3: AqiLevel(
        3,
        "Moderate",
        "moderate",
        "Sensitive groups should limit prolonged outdoor exertion.",
    ),
    4: AqiLevel(4, "Poor", "poor", "Everyone should reduce prolonged outdoor exertion."),
    5: AqiLevel(5, "Very Poor", "very-poor", "Avoid outdoor activity and keep windows closed."),
}


def level_for(value: object) -> AqiLevel | None:
    """Return the level for an integer AQI from 1 to 5, otherwise None."""
    if isinstance(value, bool) or not isinstance(value, int):
        return None
    return AQI_LEVELS.get(value)
