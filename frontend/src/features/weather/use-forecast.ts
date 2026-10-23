import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api";
import { AUTO_REFRESH_MS, useAutoRefresh } from "@/features/refresh/refresh-context";
import type { Forecast, Place } from "@/types";

/** Matches the weather cache TTL (PRD 8.4). */
export const FORECAST_REFRESH_MS = 10 * 60_000;

export function useForecast(place: Place) {
  const { autoRefresh } = useAutoRefresh();
  return useQuery({
    queryKey: ["weather-forecast", place.lat, place.lon],
    queryFn: ({ signal }) =>
      apiGet<Forecast>("/api/weather/forecast", {
        params: { lat: place.lat, lon: place.lon },
        signal,
      }),
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : FORECAST_REFRESH_MS,
    staleTime: FORECAST_REFRESH_MS / 2,
  });
}
