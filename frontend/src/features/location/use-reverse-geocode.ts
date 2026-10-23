import { useQuery } from "@tanstack/react-query";

import { apiGet } from "@/lib/api";
import type { GeocodeResponse } from "@/types";

/**
 * The nearest named place for coordinates. Enabled only while coordinates
 * are set, so it runs once per "use my location" tap.
 */
export function useReverseGeocode(
  coordinates: { lat: number; lon: number } | null,
) {
  return useQuery({
    queryKey: ["geocode-reverse", coordinates?.lat, coordinates?.lon],
    queryFn: ({ signal }) =>
      apiGet<GeocodeResponse>("/api/geocode/reverse", {
        params: { lat: coordinates!.lat, lon: coordinates!.lon },
        signal,
      }),
    enabled: coordinates !== null,
    staleTime: 24 * 60 * 60_000,
  });
}
