import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api";
import type { GeocodeResponse } from "@/types";

const DAY_MS = 24 * 60 * 60_000;

/** City search. Runs only after two characters, and keeps the last results while typing. */
export function useGeocode(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["geocode", trimmed.toLowerCase()],
    queryFn: ({ signal }) =>
      apiGet<GeocodeResponse>("/api/geocode", {
        params: { q: trimmed, limit: 5 },
        signal,
      }),
    enabled: trimmed.length >= 2,
    staleTime: DAY_MS,
    placeholderData: keepPreviousData,
  });
}
