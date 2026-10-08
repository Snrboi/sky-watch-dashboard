import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api";
import type { IssPosition, Place, PassList } from "@/types";

/** The server caches the position for 5 s, so polling faster gains nothing. */
export const ISS_POSITION_REFRESH_MS = 5_000;
export const PASSES_REFRESH_MS = 60 * 60_000;

export function useIssPosition(place: Place) {
  return useQuery({
    queryKey: ["iss-position", place.lat, place.lon],
    queryFn: ({ signal }) =>
      apiGet<IssPosition>("/api/iss/position", {
        params: { lat: place.lat, lon: place.lon },
        signal,
      }),
    refetchInterval: ISS_POSITION_REFRESH_MS,
    refetchIntervalInBackground: false,
    staleTime: ISS_POSITION_REFRESH_MS / 2,
  });
}

export function useIssPasses(place: Place, limit = 5) {
  return useQuery({
    queryKey: ["iss-passes", place.lat, place.lon, limit],
    queryFn: ({ signal }) =>
      apiGet<PassList>("/api/iss/passes", {
        params: { lat: place.lat, lon: place.lon, limit },
        signal,
      }),
    refetchInterval: PASSES_REFRESH_MS,
    staleTime: PASSES_REFRESH_MS / 2,
  });
}
