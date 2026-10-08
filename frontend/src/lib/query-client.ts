import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "@/lib/api";

/**
 * Retry once for transient failures. Do not retry when a key is missing or the request was
 * rejected, because a retry cannot fix either.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.code === "NOT_CONFIGURED" || (error.status >= 400 && error.status < 500)) {
      return false;
    }
  }
  return failureCount < 1;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
    },
  });
}
