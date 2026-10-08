/** Sample API payloads for tests. Shapes follow the generated schema. */

import type { AirQuality, ApodEntry, Background, IssPosition, LookupList, PassList, Stats, Weather } from "@/types";

const FETCHED = "2026-10-08T11:00:00Z";

export const weatherSample: Weather = {
  lat: 4.8156,
  lon: 7.0498,
  temp_c: 28.4,
  feels_like_c: 33.1,
  humidity_pct: 78,
  wind_kph: 15.1,
  condition: "Clouds",
  description: "Scattered clouds",
  icon: "clouds",
  fetched_at: FETCHED,
  stale: false,
};

export const airQualitySample: AirQuality = {
  lat: 4.8156,
  lon: 7.0498,
  aqi: 3,
  label: "Moderate",
  color: "moderate",
  advice: "Sensitive groups should limit prolonged outdoor exertion.",
  pollutants: { pm2_5: 18.6, pm10: 31.2, o3: 48.1, no2: 12.7, so2: 3.1, co: 402.5, nh3: 1.2, no: 0.5 },
  fetched_at: FETCHED,
  stale: false,
};

export const issSample: IssPosition = {
  lat: 8.39,
  lon: -79.54,
  altitude_km: 423.6,
  velocity_kmh: 27566.6,
  sunlit: true,
  observed_at: FETCHED,
  region: "Roughly over the Pacific Ocean",
  distance_km: 1934,
  source: "wheretheiss.at",
  fetched_at: FETCHED,
  stale: false,
};

export const passesSample: PassList = {
  lat: 4.8156,
  lon: 7.0498,
  passes: [
    {
      rise_at: "2026-10-09T04:11:11Z",
      rise_compass: "S",
      rise_azimuth_deg: 169.3,
      culmination_at: "2026-10-09T04:13:31Z",
      max_elevation_deg: 17.5,
      set_at: "2026-10-09T04:15:52Z",
      visible_start: "2026-10-09T04:11:11Z",
      visible_end: "2026-10-09T04:15:52Z",
      visible_duration_sec: 281,
      rating: "low",
      rating_label: "Low",
    },
    {
      rise_at: "2026-10-10T05:02:40Z",
      rise_compass: "NW",
      rise_azimuth_deg: 300.1,
      culmination_at: "2026-10-10T05:05:10Z",
      max_elevation_deg: 62.4,
      set_at: "2026-10-10T05:09:44Z",
      visible_start: "2026-10-10T05:02:40Z",
      visible_end: "2026-10-10T05:09:44Z",
      visible_duration_sec: 303,
      rating: "excellent",
      rating_label: "Excellent",
    },
  ],
  tle_epoch: "2026-10-07T19:42:27Z",
  tle_age_hours: 15.5,
  tle_stale: false,
  fetched_at: FETCHED,
  stale: false,
};

export const apodSample: ApodEntry = {
  date: "2026-10-07",
  title: "A Test Nebula",
  explanation: "A sample explanation for the photo page. It is long enough that the expand control appears on the page, so the reader can see the whole thing when they choose to.",
  media_type: "image",
  url: "https://apod.nasa.gov/apod/image/2610/nebula_1200.jpg",
  hdurl: "https://apod.nasa.gov/apod/image/2610/nebula_hd.jpg",
  copyright: "Jane Astronomer",
  page_url: "https://apod.nasa.gov/apod/ap261007.html",
  is_placeholder: false,
  fetched_at: FETCHED,
  stale: false,
};

export const backgroundSample: Background = {
  date: "2026-10-07",
  title: "A Test Nebula",
  image_url: "https://apod.nasa.gov/apod/image/2610/nebula_1200.jpg",
  hd_url: "https://apod.nasa.gov/apod/image/2610/nebula_hd.jpg",
  credit: "Jane Astronomer",
  page_url: "https://apod.nasa.gov/apod/ap261007.html",
  is_fallback: false,
  fallback_reason: null,
  fetched_at: FETCHED,
  stale: false,
};

export const emptyHistory: LookupList = { entries: [] };

export const historySample: LookupList = {
  entries: [
    {
      id: "a1",
      recorded_at: "2026-10-08T10:00:00Z",
      city: "Port Harcourt",
      state: "Rivers",
      country: "NG",
      lat: 4.8156,
      lon: 7.0498,
      temp_c: 28.4,
      aqi: 3,
      next_pass_at: "2026-10-09T04:11:11Z",
    },
    {
      id: "a2",
      recorded_at: "2026-10-07T09:00:00Z",
      city: "Lagos",
      state: "Lagos",
      country: "NG",
      lat: 6.5244,
      lon: 3.3792,
      temp_c: 30.1,
      aqi: 1,
      next_pass_at: null,
    },
  ],
};

export const statsSample: Stats = {
  total_lookups: 2,
  days_active: 2,
  unique_cities: 2,
  most_searched_city: { city: "Port Harcourt", lookups: 1 },
  average_temp_c: 29.3,
  best_aqi: { aqi: 1, label: "Good", date: "2026-10-07" },
  worst_aqi: { aqi: 3, label: "Moderate", date: "2026-10-08" },
  lookups_with_pass: 1,
  trend: [
    { date: "2026-10-07", avg_temp_c: 30.1, avg_aqi: 1 },
    { date: "2026-10-08", avg_temp_c: 28.4, avg_aqi: 3 },
  ],
};

export const geocodeSample = {
  query: "Lagos",
  results: [
    { name: "Lagos", state: "Lagos", country: "NG", lat: 6.5244, lon: 3.3792 },
    { name: "Lagos", state: "Algarve", country: "PT", lat: 37.1, lon: -8.67 },
  ],
  fetched_at: FETCHED,
  stale: false,
};
