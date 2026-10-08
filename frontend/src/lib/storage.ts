/**
 * Browser storage: the chosen place and the per-browser client ID.
 * Storage can be blocked (private mode, disabled cookies). Every access fails soft.
 */

import type { Place } from "@/types";

const PLACE_KEY = "skywatch.place.v1";
const CLIENT_ID_KEY = "skywatch.clientId.v1";
const CLIENT_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export const DEFAULT_PLACE: Place = {
  name: "Port Harcourt",
  state: "Rivers",
  country: "NG",
  lat: 4.8156,
  lon: 7.0498,
};

export function isPlace(value: unknown): value is Place {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    candidate.name.length > 0 &&
    typeof candidate.country === "string" &&
    (candidate.state === undefined || candidate.state === null || typeof candidate.state === "string") &&
    typeof candidate.lat === "number" &&
    Number.isFinite(candidate.lat) &&
    candidate.lat >= -90 &&
    candidate.lat <= 90 &&
    typeof candidate.lon === "number" &&
    Number.isFinite(candidate.lon) &&
    candidate.lon >= -180 &&
    candidate.lon <= 180
  );
}

export function loadPlace(): Place {
  try {
    const raw = window.localStorage.getItem(PLACE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isPlace(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Unreadable storage: fall back to the default place.
  }
  return DEFAULT_PLACE;
}

export function savePlace(place: Place): void {
  try {
    window.localStorage.setItem(PLACE_KEY, JSON.stringify(place));
  } catch {
    // The choice still applies for this visit.
  }
}

function newClientId(): string {
  const random = globalThis.crypto?.randomUUID?.();
  return random ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

let cachedClientId: string | undefined;

/** A random ID kept in this browser. The server scopes history to it. */
export function getClientId(): string {
  if (cachedClientId) {
    return cachedClientId;
  }
  try {
    const existing = window.localStorage.getItem(CLIENT_ID_KEY);
    if (existing && CLIENT_ID_PATTERN.test(existing)) {
      cachedClientId = existing;
      return existing;
    }
    const created = newClientId();
    window.localStorage.setItem(CLIENT_ID_KEY, created);
    cachedClientId = created;
    return created;
  } catch {
    cachedClientId = newClientId();
    return cachedClientId;
  }
}
