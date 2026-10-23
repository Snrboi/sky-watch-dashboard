import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api";
import { AUTO_REFRESH_MS, useAutoRefresh } from "@/features/refresh/refresh-context";
import type { AirQuality, Place } from "@/types";

/** Matches the server cache TTL (PRD 8.4). */
export const AIR_QUALITY_REFRESH_MS = 30 * 60_000;

export function useAirQuality(place: Place) {
  const { autoRefresh } = useAutoRefresh();
  return useQuery({
    queryKey: ["air-quality", place.lat, place.lon],
    queryFn: ({ signal }) =>
      apiGet<AirQuality>("/api/air-quality", {
        params: { lat: place.lat, lon: place.lon },
        signal,
      }),
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : AIR_QUALITY_REFRESH_MS,
    staleTime: AIR_QUALITY_REFRESH_MS / 2,
  });
}
