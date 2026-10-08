import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiGet, apiPost } from "@/lib/api";
import { getClientId } from "@/lib/storage";
import type { LookupList, LookupRequest, LookupResult, Place, Stats } from "@/types";

export function useHistory(limit = 200) {
  const clientId = getClientId();
  return useQuery({
    queryKey: ["history", clientId, limit],
    queryFn: ({ signal }) =>
      apiGet<LookupList>("/api/history", { params: { limit }, clientId, signal }),
  });
}

export function useHistoryStats() {
  const clientId = getClientId();
  return useQuery({
    queryKey: ["history-stats", clientId],
    queryFn: ({ signal }) => apiGet<Stats>("/api/history/stats", { clientId, signal }),
  });
}

/** Saves a lookup for the place. The server throttles to one per place every 30 minutes. */
export function useRecordLookup() {
  const queryClient = useQueryClient();
  const clientId = getClientId();
  return useMutation({
    mutationFn: (place: Place) => {
      const body: LookupRequest = {
        city: place.name,
        state: place.state,
        country: place.country,
        lat: place.lat,
        lon: place.lon,
      };
      return apiPost<LookupResult>("/api/history", body, { clientId });
    },
    onSuccess: (result) => {
      if (result.recorded) {
        void queryClient.invalidateQueries({ queryKey: ["history"] });
        void queryClient.invalidateQueries({ queryKey: ["history-stats"] });
      }
    },
  });
}
