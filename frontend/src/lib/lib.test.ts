import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiGet, apiPost, buildUrl } from "@/lib/api";
import { aqiStyle, tokenForAqi } from "@/lib/aqi";
import { addDays } from "@/lib/dates";
import { formatCoordinates, formatDay, formatDuration, formatKm, formatRelative, formatTemp } from "@/lib/format";
import { shouldJump, project, MAP_WIDTH } from "@/lib/geo";
import { motionDuration } from "@/lib/motion";
import { DEFAULT_PLACE, getClientId, isPlace, loadPlace, savePlace } from "@/lib/storage";
import { shouldRetry } from "@/lib/query-client";
import { weatherIcon } from "@/lib/weather";
import { Cloud, Thermometer } from "lucide-react";
import { apiError, json, stubFetch } from "@/test/fetch-mock";

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("api client", () => {
  it("builds query strings and skips empty values", () => {
    expect(buildUrl("/api/x", { lat: 4.8, lon: 7, q: undefined, empty: "" })).toBe("/api/x?lat=4.8&lon=7");
    expect(buildUrl("/api/x")).toBe("/api/x");
  });

  it("turns the error envelope into an ApiError with code and source", async () => {
    stubFetch({ "/api/weather": () => apiError("NOT_CONFIGURED", "Key missing.", 503, "weather") });
    const error = await apiGet("/api/weather").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 503, code: "NOT_CONFIGURED", source: "weather", message: "Key missing." });
  });

  it("reports a dropped connection as NETWORK", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    await expect(apiGet("/api/health")).rejects.toMatchObject({ code: "NETWORK", status: 0 });
  });

  it("sends the client ID header on history calls", async () => {
    const spy = stubFetch({ "/api/history": () => json({ recorded: true }) });
    await apiPost("/api/history", { city: "Lagos" }, { clientId: "browser-abc-123" });
    const init = spy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>)["X-Client-Id"]).toBe("browser-abc-123");
    expect(init.body).toBe(JSON.stringify({ city: "Lagos" }));
  });
});

describe("formatting", () => {
  it("formats durations, distances, temperatures, and coordinates", () => {
    expect(formatDuration(281)).toBe("4 min 41 s");
    expect(formatDuration(45)).toBe("45 s");
    expect(formatDuration(null)).toBe("—");
    expect(formatKm(1934)).toBe("1,934 km");
    expect(formatTemp(28.4)).toBe("28°");
    expect(formatTemp(null)).toBe("—");
    expect(formatCoordinates(4.8156, -7.0498)).toBe("4.82° N, 7.05° W");
  });

  it("describes relative times", () => {
    const now = Date.parse("2026-10-08T12:00:00Z");
    expect(formatRelative("2026-10-08T11:59:30Z", now)).toBe("just now");
    expect(formatRelative("2026-10-08T11:48:00Z", now)).toBe("12 minutes ago");
    expect(formatRelative("2026-10-08T09:00:00Z", now)).toBe("3 hours ago");
  });

  it("formats date-only strings without a timezone shift", () => {
    expect(formatDay("2026-10-07")).toContain("2026");
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });
});

describe("AQI and weather tokens", () => {
  it("maps history AQI numbers to the API colour tokens", () => {
    expect(tokenForAqi(1)).toBe("good");
    expect(tokenForAqi(5)).toBe("very-poor");
    expect(tokenForAqi(0)).toBeNull();
    expect(tokenForAqi(null)).toBeNull();
  });

  it("falls back to neutral styling for an unknown token", () => {
    expect(aqiStyle("mystery").text).toBe("text-muted-foreground");
    expect(aqiStyle("poor").text).toBe("text-aqi-poor");
  });

  it("maps weather icon tokens and falls back to a thermometer", () => {
    expect(weatherIcon("clouds")).toBe(Cloud);
    expect(weatherIcon("unknown")).toBe(Thermometer);
  });
});

describe("storage", () => {
  it("returns the default place until one is saved", () => {
    expect(loadPlace()).toEqual(DEFAULT_PLACE);
    savePlace({ name: "Lagos", state: "Lagos", country: "NG", lat: 6.5244, lon: 3.3792 });
    expect(loadPlace().name).toBe("Lagos");
  });

  it("ignores a corrupted or out-of-range stored place", () => {
    window.localStorage.setItem("skywatch.place.v1", "{not json");
    expect(loadPlace()).toEqual(DEFAULT_PLACE);
    expect(isPlace({ name: "X", country: "NG", state: null, lat: 200, lon: 0 })).toBe(false);
  });

  it("keeps one client ID per browser, in the format the server accepts", () => {
    const first = getClientId();
    expect(first).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    expect(getClientId()).toBe(first);
    expect(window.localStorage.getItem("skywatch.clientId.v1")).toBe(first);
  });
});

describe("query retry policy", () => {
  it("does not retry missing keys or client errors, but retries a network blip once", () => {
    expect(shouldRetry(0, new ApiError("x", { status: 503, code: "NOT_CONFIGURED", source: "weather" }))).toBe(false);
    expect(shouldRetry(0, new ApiError("x", { status: 400, code: "BAD_INPUT", source: "api" }))).toBe(false);
    expect(shouldRetry(0, new ApiError("x", { status: 0, code: "NETWORK", source: "network" }))).toBe(true);
    expect(shouldRetry(1, new ApiError("x", { status: 0, code: "NETWORK", source: "network" }))).toBe(false);
  });
});

describe("motion budget helpers", () => {
  it("returns zero durations under reduced motion", () => {
    expect(motionDuration(0.6, true)).toBe(0);
    expect(motionDuration(0.6, false)).toBe(0.6);
  });
});

describe("map geometry", () => {
  it("projects coordinates inside the map box", () => {
    const point = project(4.8156, 7.0498);
    expect(point).not.toBeNull();
    expect(point!.x).toBeGreaterThan(0);
    expect(point!.x).toBeLessThan(MAP_WIDTH);
  });

  it("does not glide across the whole map when the ISS crosses the antimeridian", () => {
    expect(shouldJump(470, 480)).toBe(false);
    expect(shouldJump(10, 950)).toBe(true);
  });
});
