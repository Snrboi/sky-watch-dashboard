import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderApp } from "@/test/render";
import { apiError, json, stubFetch } from "@/test/fetch-mock";
import {
  airQualitySample,
  apodSample,
  backgroundSample,
  emptyHistory,
  geocodeSample,
  historySample,
  issSample,
  passesSample,
  statsSample,
  weatherSample,
} from "@/test/fixtures";

const SOURCES = {
  "/api/weather": () => json(weatherSample),
  "/api/air-quality": () => json(airQualitySample),
  "/api/iss/position": () => json(issSample),
  "/api/iss/passes": () => json(passesSample),
  "/api/apod": () => json(apodSample),
  "/api/apod/background": () => json(backgroundSample),
  "/api/history": () => json({ recorded: true, entry: historySample.entries[0], throttled_until: null }),
};

describe("Overview page", () => {
  it("shows every card with live data", async () => {
    stubFetch({ ...SOURCES, "/api/history": (_url, init) => (init?.method === "POST" ? json({ recorded: true, entry: historySample.entries[0], throttled_until: null }) : json(historySample)) });
    renderApp({ route: "/" });

    expect(await screen.findByRole("heading", { level: 1, name: "Sky over Port Harcourt" })).toBeInTheDocument();
    expect(await screen.findByText("Scattered clouds")).toBeInTheDocument();
    expect(await screen.findByText("Moderate")).toBeInTheDocument();
    expect(await screen.findByText("Roughly over the Pacific Ocean")).toBeInTheDocument();
    // The Overview shows the next pass only (17.5 degrees, rated Low).
    expect(await screen.findByText("Low")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Photo of the day" })).toBeInTheDocument();
  });

  it("keeps the other cards working when one source fails", async () => {
    stubFetch({
      ...SOURCES,
      "/api/air-quality": () => apiError("UPSTREAM_UNAVAILABLE", "air-quality is unavailable (HTTP 500).", 503, "air-quality"),
    });
    renderApp({ route: "/" });

    expect(await screen.findByText("Scattered clouds")).toBeInTheDocument();
    expect(await screen.findByText("Air quality is unavailable")).toBeInTheDocument();
    expect(screen.getByText("air-quality is unavailable (HTTP 500).")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ISS now" })).toBeInTheDocument();
  });

  it("names the missing key when the weather key is not set", async () => {
    stubFetch({
      ...SOURCES,
      "/api/weather": () =>
        apiError("NOT_CONFIGURED", "The OpenWeatherMap key is not set. Add OPENWEATHER_API_KEY to backend/.env.", 503, "weather"),
    });
    renderApp({ route: "/" });
    expect(await screen.findByText(/OPENWEATHER_API_KEY/)).toBeInTheDocument();
  });

  it("records the lookup once for the place", async () => {
    const spy = stubFetch(SOURCES);
    renderApp({ route: "/" });
    await waitFor(() => {
      const posts = spy.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === "POST");
      expect(posts).toHaveLength(1);
    });
    const [url, init] = spy.mock.calls.find(([, call]) => (call as RequestInit | undefined)?.method === "POST") as [string, RequestInit];
    expect(String(url)).toContain("/api/history");
    expect(JSON.parse(init.body as string)).toMatchObject({ city: "Port Harcourt", country: "NG" });
  });
});

describe("History page", () => {
  it("shows the empty state for a new browser", async () => {
    stubFetch({ "/api/history": () => json(emptyHistory) });
    renderApp({ route: "/history" });
    expect(await screen.findByText("No lookups yet")).toBeInTheDocument();
  });

  it("lists lookups and filters them by city", async () => {
    stubFetch({ "/api/history": () => json(historySample) });
    renderApp({ route: "/history" });

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Port Harcourt")).toBeInTheDocument();
    expect(within(table).getByText("Lagos")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter by city"), { target: { value: "lag" } });
    await waitFor(() => expect(within(screen.getByRole("table")).queryByText("Port Harcourt")).toBeNull());
    expect(within(screen.getByRole("table")).getByText("Lagos")).toBeInTheDocument();
  });
});

describe("ISS page", () => {
  it("shows the map summary and the upcoming passes", async () => {
    stubFetch(SOURCES);
    renderApp({ route: "/iss" });
    expect(await screen.findByRole("heading", { level: 1, name: "ISS tracker" })).toBeInTheDocument();
    expect(await screen.findByText(/The ISS is roughly over the Pacific Ocean/)).toBeInTheDocument();
    const passButtons = await screen.findAllByRole("button", { expanded: false });
    expect(passButtons.length).toBeGreaterThan(0);
  });
});

describe("Stats page", () => {
  it("shows the headline numbers and the trend", async () => {
    stubFetch({ "/api/history/stats": () => json(statsSample) });
    renderApp({ route: "/stats" });
    expect(await screen.findByText("Total lookups")).toBeInTheDocument();
    expect(screen.getByText("Average temperature")).toBeInTheDocument();
    expect(screen.getByText("Lookups with an upcoming pass")).toBeInTheDocument();
    expect(screen.getByText(/Trend across 2 days/)).toBeInTheDocument();
  });
});

describe("Photo page", () => {
  it("shows the title, credit, and NASA link", async () => {
    stubFetch({ "/api/apod": () => json(apodSample) });
    renderApp({ route: "/photo" });
    expect(await screen.findByRole("heading", { level: 2, name: "A Test Nebula" })).toBeInTheDocument();
    expect(screen.getByText("Jane Astronomer")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view on nasa/i })).toHaveAttribute("href", apodSample.page_url);
  });

  it("explains a placeholder instead of showing NASA's logo", async () => {
    stubFetch({ "/api/apod": () => json({ ...apodSample, is_placeholder: true, media_type: "image" }) });
    renderApp({ route: "/photo" });
    expect(await screen.findByText(/NASA returned a placeholder/)).toBeInTheDocument();
  });
});

describe("Routing and shell", () => {
  it("shows the not-found page for an unknown path", async () => {
    stubFetch(SOURCES);
    renderApp({ route: "/no-such-page" });
    expect(await screen.findByRole("heading", { name: "This page drifted out of orbit." })).toBeInTheDocument();
  });

  it("opens the command palette with Ctrl+K and navigates to a page", async () => {
    stubFetch({ ...SOURCES, "/api/history/stats": () => json(statsSample) });
    renderApp({ route: "/" });
    await screen.findByRole("heading", { level: 1, name: "Sky over Port Harcourt" });

    act(() => {
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    });
    const palette = await screen.findByRole("dialog", { name: "Command palette" });
    fireEvent.click(within(palette).getByText("Statistics"));

    expect(await screen.findByRole("heading", { level: 1, name: "Statistics" })).toBeInTheDocument();
  });

  it("searches for a city and applies the choice", async () => {
    stubFetch({ ...SOURCES, "/api/geocode": () => json(geocodeSample) });
    renderApp({ route: "/" });
    await screen.findByRole("heading", { level: 1, name: "Sky over Port Harcourt" });

    fireEvent.click(screen.getByRole("button", { name: /change city/i }));
    const dialog = await screen.findByRole("dialog", { name: "Choose a city" });
    fireEvent.change(within(dialog).getByPlaceholderText("Search for a city"), { target: { value: "Lagos" } });

    const options = await within(dialog).findAllByRole("option", {}, { timeout: 2000 });
    fireEvent.click(options[0]);
    expect(await screen.findByRole("heading", { level: 1, name: "Sky over Lagos" })).toBeInTheDocument();
    expect(window.localStorage.getItem("skywatch.place.v1")).toContain('"Lagos"');
  });
});
