import { describe, expect, it } from "vitest";

import { passIcs } from "@/features/iss/pass-calendar";
import { formatCountdown, passTimeOfDay } from "@/features/iss/iss-format";
import { loadRecentPlaces, saveRecentPlace } from "@/lib/storage";
import { polygonPath, terminatorPolygon, trackPaths } from "@/lib/geo";
import { passesSample, trackSample } from "@/test/fixtures";

describe("the day/night terminator", () => {
  it("wraps the dark pole, so the night half is one polygon", () => {
    const polygon = terminatorPolygon(10, 20);
    expect(polygon).not.toBeNull();
    expect(polygon!.length).toBeGreaterThan(80);
    // The last two points close the shape along the southern edge.
    const [secondToLast, last] = [
      polygon![polygon!.length - 2],
      polygon![polygon!.length - 1],
    ];
    expect(secondToLast.y).toBeCloseTo(480, -1);
    expect(last.y).toBeCloseTo(480, -1);
    expect(polygonPath(polygon!)).toMatch(/^M[\d., LMZ]+ Z$/);
  });

  it("becomes a rectangle at the equinox, when the sun sits over the equator", () => {
    const polygon = terminatorPolygon(0, 0);
    expect(polygon).not.toBeNull();
    expect(polygon).toHaveLength(4);
  });

  it("returns nothing without the sun's coordinates", () => {
    expect(terminatorPolygon(NaN, 0)).toBeNull();
  });
});

describe("the ground track", () => {
  it("splits at the present moment and breaks at the antimeridian", () => {
    const nowMs = new Date("2026-10-08T11:59:30Z").getTime();
    const split = trackPaths(trackSample.points, nowMs, (point) =>
      new Date(point.at ?? 0).getTime(),
    );
    expect(split.past).not.toBe("");
    expect(split.future).not.toBe("");
    // One moveto means one unbroken past line.
    expect(split.past.match(/M/g)).toHaveLength(1);
  });
});

describe("pass helpers", () => {
  it("says morning or evening by the viewer's clock", () => {
    expect(passTimeOfDay("2026-10-09T04:11:11Z")).toBe("morning");
    expect(passTimeOfDay("2026-10-09T18:11:11Z")).toBe("evening");
    expect(passTimeOfDay("2026-10-09T14:11:11Z")).toBe("night");
  });

  it("counts down to a pass, and gives up once it starts", () => {
    const now = new Date("2026-10-08T12:00:00Z").getTime();
    expect(formatCountdown("2026-10-08T18:12:00Z", now)).toBe("in 6 h 12 min");
    expect(formatCountdown("2026-10-08T12:00:30Z", now)).toBe("in 30 s");
    expect(formatCountdown("2026-10-08T11:00:00Z", now)).toBeNull();
    expect(formatCountdown(undefined, now)).toBeNull();
  });

  it("builds a calendar file with UTC times", () => {
    const pass = passesSample.passes[0];
    const ics = passIcs(pass, "Port Harcourt");
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("SUMMARY:ISS visible pass over Port Harcourt");
    expect(ics).toContain("DTSTART:20261009T041111Z");
    expect(ics).toContain("END:VCALENDAR");
  });
});

describe("recent places", () => {
  it("keeps the last five, newest first, without duplicates", () => {
    window.localStorage.clear();
    const first = { name: "Lagos", state: "Lagos", country: "NG", lat: 6.5, lon: 3.4 };
    const second = { name: "Abuja", state: "FCT", country: "NG", lat: 9.0, lon: 7.5 };
    saveRecentPlace(first);
    saveRecentPlace(second);
    saveRecentPlace(first);
    expect(loadRecentPlaces().map((place) => place.name)).toEqual([
      "Lagos",
      "Abuja",
    ]);
    window.localStorage.clear();
  });
});
