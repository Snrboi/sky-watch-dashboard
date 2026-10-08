import { vi } from "vitest";

export type Responder = (url: URL, init?: RequestInit) => Response | Promise<Response>;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function apiError(code: string, message: string, status = 503, source = "api"): Response {
  return json({ error: { code, source, message } }, status);
}

/**
 * Replace fetch with a router keyed by pathname. Unknown paths answer 404 so a missing mock
 * fails loudly. Returns the spy so tests can inspect calls.
 */
export function stubFetch(routes: Record<string, Responder>) {
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, "http://localhost");
    const responder = routes[url.pathname];
    if (!responder) {
      return apiError("NOT_FOUND", `No mock for ${url.pathname}`, 404, "test");
    }
    return responder(url, init);
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}
