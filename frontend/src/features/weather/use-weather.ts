import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api";
import { AUTO_REFRESH_MS, useAutoRefresh } from "@/features/refresh/refresh-context";
import type { Place, Weather } from "@/types";

/** Matches the server cache TTL (PRD 8.4). */
export const WEATHER_REFRESH_MS = 10 * 60_000;

export function useWeather(place: Place) {
  const { autoRefresh } = useAutoRefresh();
  return useQuery({
    queryKey: ["weather", place.lat, place.lon],
    queryFn: ({ signal }) =>
      apiGet<Weather>("/api/weather", {
        params: { lat: place.lat, lon: place.lon },
        signal,
      }),
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : WEATHER_REFRESH_MS,
    staleTime: WEATHER_REFRESH_MS / 2,
  });
}
