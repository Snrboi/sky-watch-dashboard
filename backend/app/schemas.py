"""Pydantic models: the API contract. Every route returns one of these.

Upstream data responses carry `fetched_at` (UTC) and `stale` (true when an older value was
served because an upstream failed).
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class Meta(BaseModel):
    fetched_at: datetime = Field(description="When the upstream data was fetched (UTC).")
    stale: bool = Field(
        description="True when an older value was served after an upstream failure."
    )


class Health(BaseModel):
    status: Literal["ok"]
    version: str
    time: datetime


class Place(BaseModel):
    name: str
    state: str | None = None
    country: str
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


class GeocodeResponse(Meta):
    query: str
    results: list[Place] = Field(max_length=5)


class Weather(Meta):
    lat: float
    lon: float
    temp_c: float
    feels_like_c: float
    humidity_pct: int
    wind_kph: float
    condition: str = Field(description="OpenWeatherMap main condition, for example Clouds.")
    description: str
    icon: str = Field(description="Icon token such as clear, clouds, rain, fog, or unknown.")


class Pollutants(BaseModel):
    pm2_5: float | None
    pm10: float | None
    o3: float | None
    no2: float | None
    so2: float | None
    co: float | None
    nh3: float | None
    no: float | None


class AirQuality(Meta):
    lat: float
    lon: float
    aqi: int | None = Field(ge=1, le=5)
    label: str | None
    color: str | None = Field(description="Color token: good, fair, moderate, poor, or very-poor.")
    advice: str | None
    pollutants: Pollutants = Field(description="Concentrations in micrograms per cubic metre.")


class IssPosition(Meta):
    lat: float
    lon: float
    altitude_km: float | None
    velocity_kmh: float | None
    sunlit: bool | None = Field(description="False when the station is in Earth's shadow.")
    observed_at: datetime
    region: str = Field(description='Rough place name, always phrased "Roughly over ...".')
    distance_km: float | None = Field(
        description="Great-circle distance from the chosen place, when given."
    )
    source: Literal["wheretheiss.at", "open-notify"]


class IssPass(BaseModel):
    rise_at: datetime
    rise_compass: str
    rise_azimuth_deg: float | None
    culmination_at: datetime | None
    max_elevation_deg: float
    set_at: datetime | None
    visible_start: datetime | None
    visible_end: datetime | None
    visible_duration_sec: int | None
    rating: Literal["excellent", "good", "low"]
    rating_label: str


class PassList(Meta):
    lat: float
    lon: float
    passes: list[IssPass] = Field(max_length=5)
    tle_epoch: datetime | None
    tle_age_hours: float | None
    tle_stale: bool | None = Field(
        description="True when the orbit data is old enough to lose accuracy."
    )


class ApodEntry(Meta):
    date: str
    title: str
    explanation: str
    media_type: str
    url: str | None
    hdurl: str | None
    copyright: str | None
    page_url: str
    is_placeholder: bool = Field(
        description="True when NASA returned its logo instead of a picture."
    )


class Background(Meta):
    date: str
    title: str
    image_url: str
    hd_url: str | None = Field(description="Larger image for screens 1600 px and wider.")
    credit: str
    page_url: str | None
    is_fallback: bool
    fallback_reason: str | None


class LookupRequest(BaseModel):
    city: str = Field(min_length=1, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    country: str = Field(default="", max_length=100)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)

    @field_validator("city", "country")
    @classmethod
    def _trim(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("state")
    @classmethod
    def _trim_optional(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return " ".join(value.split()) or None


class LookupEntry(BaseModel):
    id: str
    recorded_at: datetime
    city: str
    state: str | None
    country: str
    lat: float
    lon: float
    temp_c: float | None
    aqi: int | None
    next_pass_at: datetime | None


class LookupResult(BaseModel):
    recorded: bool = Field(
        description="False when the same place was saved less than 30 minutes ago."
    )
    entry: LookupEntry
    throttled_until: datetime | None


class LookupList(BaseModel):
    entries: list[LookupEntry]


class CityCount(BaseModel):
    city: str
    lookups: int


class AqiRecord(BaseModel):
    aqi: int
    label: str
    date: str


class TrendPoint(BaseModel):
    date: str
    avg_temp_c: float | None
    avg_aqi: float | None


class Stats(BaseModel):
    total_lookups: int
    days_active: int = Field(description="Distinct UTC dates with at least one lookup.")
    unique_cities: int
    most_searched_city: CityCount | None
    average_temp_c: float | None
    best_aqi: AqiRecord | None
    worst_aqi: AqiRecord | None
    lookups_with_pass: int = Field(description="Lookups where an ISS pass was found.")
    trend: list[TrendPoint]
