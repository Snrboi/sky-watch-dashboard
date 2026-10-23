import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api";
import { AUTO_REFRESH_MS, useAutoRefresh } from "@/features/refresh/refresh-context";
import type { ApodEntry, Background } from "@/types";

/** The server caches APOD for 1 hour (PRD 8.4). */
export const APOD_REFRESH_MS = 60 * 60_000;
/** A random picture is only random for a few minutes. */
export const APOD_RANDOM_REFRESH_MS = 5 * 60_000;

export function useApod(date?: string, random = false) {
  const { autoRefresh } = useAutoRefresh();
  return useQuery({
    queryKey: random ? ["apod", "random"] : ["apod", date ?? "latest"],
    queryFn: ({ signal }) =>
      random
        ? apiGet<ApodEntry>("/api/apod/random", { signal })
        : apiGet<ApodEntry>("/api/apod", { params: { date }, signal }),
    staleTime: APOD_REFRESH_MS / 2,
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : APOD_REFRESH_MS,
  });
}

export function useBackground() {
  return useQuery({
    queryKey: ["apod-background"],
    queryFn: ({ signal }) => apiGet<Background>("/api/apod/background", { signal }),
    staleTime: APOD_REFRESH_MS / 2,
    refetchInterval: APOD_REFRESH_MS,
  });
}
