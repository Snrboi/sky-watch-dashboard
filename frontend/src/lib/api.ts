/**
 * Typed fetch wrapper for the Sky Watch API.
 *
 * Every failure becomes an ApiError with the backend's error code and source, so UI code
 * can show the right message without parsing responses itself.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly source: string;

  constructor(message: string, details: { status: number; code: string; source: string }) {
    super(message);
    this.name = "ApiError";
    this.status = details.status;
    this.code = details.code;
    this.source = details.source;
  }
}

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface RequestOptions {
  params?: QueryParams;
  signal?: AbortSignal;
  clientId?: string;
}

export const CLIENT_ID_HEADER = "X-Client-Id";

export function buildUrl(path: string, params?: QueryParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

async function readError(response: Response): Promise<ApiError> {
  let envelope: { error?: { code?: string; message?: string; source?: string } } | undefined;
  try {
    envelope = (await response.json()) as typeof envelope;
  } catch {
    envelope = undefined;
  }
  return new ApiError(envelope?.error?.message ?? `The server answered with HTTP ${response.status}.`, {
    status: response.status,
    code: envelope?.error?.code ?? "HTTP_ERROR",
    source: envelope?.error?.source ?? "api",
  });
}

async function send<T>(path: string, init: RequestInit, options: RequestOptions): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.clientId) {
    headers[CLIENT_ID_HEADER] = options.clientId;
  }
  if (init.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.params), {
      ...init,
      headers,
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError("Could not reach the server. Check your connection and try again.", {
      status: 0,
      code: "NETWORK",
      source: "network",
    });
  }

  if (!response.ok) {
    throw await readError(response);
  }
  return (await response.json()) as T;
}

export function apiGet<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return send<T>(path, { method: "GET" }, options);
}

export function apiPost<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
  return send<T>(path, { method: "POST", body: JSON.stringify(body) }, options);
}
