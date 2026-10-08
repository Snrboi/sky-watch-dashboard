import { render, waitFor } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { describe, expect, it } from "vitest";

import { IssMap } from "@/features/iss/IssMap";
import { project } from "@/lib/geo";
import { DEFAULT_PLACE } from "@/lib/storage";
import { issSample } from "@/test/fixtures";

describe("IssMap marker", () => {
  it("starts at the reported position instead of gliding in from the map corner", async () => {
    // Animations stay on here, because the bug only showed on the animated path.
    const { container } = render(
      <MotionConfig reducedMotion="never">
        <IssMap position={issSample} place={DEFAULT_PLACE} />
      </MotionConfig>,
    );
    const expected = project(issSample.lat, issSample.lon);
    expect(expected).not.toBeNull();
    const marker = container.querySelector("circle.fill-sky");
    expect(marker).not.toBeNull();
    await waitFor(() => {
      expect(Number(marker!.getAttribute("cx"))).toBeCloseTo(expected!.x, 0);
      expect(Number(marker!.getAttribute("cy"))).toBeCloseTo(expected!.y, 0);
    });
  });

  it("draws the place marker without an ISS position", () => {
    const { container } = render(<IssMap position={undefined} place={DEFAULT_PLACE} />);
    expect(container.querySelector("circle.fill-sky")).toBeNull();
    expect(container.querySelector("circle.fill-foreground")).not.toBeNull();
  });
});
