import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api";
import type { ApodEntry, Background } from "@/types";

/** The server caches APOD for 1 hour (PRD 8.4). */
export const APOD_REFRESH_MS = 60 * 60_000;

export function useApod(date?: string) {
  return useQuery({
    queryKey: ["apod", date ?? "latest"],
    queryFn: ({ signal }) => apiGet<ApodEntry>("/api/apod", { params: { date }, signal }),
    staleTime: APOD_REFRESH_MS / 2,
    refetchInterval: APOD_REFRESH_MS,
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
