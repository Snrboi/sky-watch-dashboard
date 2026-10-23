import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api";
import { AUTO_REFRESH_MS, useAutoRefresh } from "@/features/refresh/refresh-context";
import type { Astros, IssPosition, IssTrack, PassList, Place } from "@/types";

/** The server caches the position for 5 s, so polling faster gains nothing. */
export const ISS_POSITION_REFRESH_MS = 5_000;
export const PASSES_REFRESH_MS = 60 * 60_000;
export const TRACK_REFRESH_MS = 30_000;
export const ASTROS_REFRESH_MS = 15 * 60_000;

export function useIssPosition(place: Place) {
  const { autoRefresh } = useAutoRefresh();
  return useQuery({
    queryKey: ["iss-position", place.lat, place.lon],
    queryFn: ({ signal }) =>
      apiGet<IssPosition>("/api/iss/position", {
        params: { lat: place.lat, lon: place.lon },
        signal,
      }),
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : ISS_POSITION_REFRESH_MS,
    refetchIntervalInBackground: false,
    staleTime: ISS_POSITION_REFRESH_MS / 2,
  });
}

export function useIssPasses(place: Place, limit = 5) {
  const { autoRefresh } = useAutoRefresh();
  return useQuery({
    queryKey: ["iss-passes", place.lat, place.lon, limit],
    queryFn: ({ signal }) =>
      apiGet<PassList>("/api/iss/passes", {
        params: { lat: place.lat, lon: place.lon, limit },
        signal,
      }),
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : PASSES_REFRESH_MS,
    staleTime: PASSES_REFRESH_MS / 2,
  });
}

/** The ground track: where the station has been, and where it is going. */
export function useIssTrack(place: Place) {
  const { autoRefresh } = useAutoRefresh();
  return useQuery({
    queryKey: ["iss-track", place.lat, place.lon],
    queryFn: ({ signal }) =>
      apiGet<IssTrack>("/api/iss/track", {
        params: { lat: place.lat, lon: place.lon, minutes: 45 },
        signal,
      }),
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : TRACK_REFRESH_MS,
    refetchIntervalInBackground: false,
    staleTime: TRACK_REFRESH_MS / 2,
  });
}

/** The roster of people in space. It changes slowly, so it polls gently. */
export function useAstros() {
  const { autoRefresh } = useAutoRefresh();
  return useQuery({
    queryKey: ["iss-astros"],
    queryFn: ({ signal }) => apiGet<Astros>("/api/iss/astros", { signal }),
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : ASTROS_REFRESH_MS,
    staleTime: ASTROS_REFRESH_MS / 2,
  });
}
