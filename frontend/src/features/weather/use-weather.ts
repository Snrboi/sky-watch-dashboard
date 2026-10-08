import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api";
import type { Place, Weather } from "@/types";

/** Matches the server cache TTL (PRD 8.4). */
export const WEATHER_REFRESH_MS = 10 * 60_000;

export function useWeather(place: Place) {
  return useQuery({
    queryKey: ["weather", place.lat, place.lon],
    queryFn: ({ signal }) =>
      apiGet<Weather>("/api/weather", {
        params: { lat: place.lat, lon: place.lon },
        signal,
      }),
    refetchInterval: WEATHER_REFRESH_MS,
    staleTime: WEATHER_REFRESH_MS / 2,
  });
}
