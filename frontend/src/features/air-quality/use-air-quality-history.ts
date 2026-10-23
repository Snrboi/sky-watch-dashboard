import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api";
import { AUTO_REFRESH_MS, useAutoRefresh } from "@/features/refresh/refresh-context";
import type { AqiHistory, Place } from "@/types";

/** Hourly AQI for the last day, as a sparkline. */
export function useAirQualityHistory(place: Place) {
  const { autoRefresh } = useAutoRefresh();
  return useQuery({
    queryKey: ["air-quality-history", place.lat, place.lon],
    queryFn: ({ signal }) =>
      apiGet<AqiHistory>("/api/air-quality/history", {
        params: { lat: place.lat, lon: place.lon },
        signal,
      }),
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : 30 * 60_000,
    staleTime: 30 * 60_000 / 2,
  });
}
