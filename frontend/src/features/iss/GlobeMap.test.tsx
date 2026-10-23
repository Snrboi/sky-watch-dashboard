import { render } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { describe, expect, it } from "vitest";

import { GlobeMap } from "@/features/iss/GlobeMap";
import { DEFAULT_PLACE } from "@/lib/storage";
import { issSample } from "@/test/fixtures";

describe("GlobeMap", () => {
  it("shows the textured, rotatable Earth when WebGL is unavailable", () => {
    // jsdom has no WebGL; it should still render a rotatable Earth, not a flat map.
    const { container, getAllByText, getByRole, getByText } = render(
      <MotionConfig reducedMotion="never">
        <GlobeMap position={issSample} place={DEFAULT_PLACE} />
      </MotionConfig>,
    );
    expect(getByRole("group", { name: /interactive Earth globe/i })).toBeTruthy();
    expect(getByText(/Drag to rotate/)).toBeTruthy();
    expect(getAllByText("ISS", { exact: true }).length).toBeGreaterThan(0);
    expect(getByText(DEFAULT_PLACE.name)).toBeTruthy();
    expect(container.querySelector('[data-map-marker="place"] svg[viewBox="0 0 24 32"]')).not.toBeNull();
    expect(container.querySelector('[data-map-marker="iss"] img[src="/iss-marker.svg"]')).not.toBeNull();
    expect(container.querySelector("[data-iss-ground-tether='true']")).not.toBeNull();
    expect(container.querySelector('[data-map-marker="place"] svg path[fill="#ff3b47"]')).not.toBeNull();
    const userConnection = container.querySelector("[data-iss-user-connection=\"true\"]");
    expect(userConnection).not.toBeNull();
    expect(userConnection).toHaveClass("border-black", "border-dotted");
  });
});
