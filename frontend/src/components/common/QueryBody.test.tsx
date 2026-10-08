import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { QueryBody, SkeletonLines } from "@/components/common/QueryBody";
import { StaleNotice } from "@/components/common/StaleNotice";

const base = {
  isError: false,
  error: null,
  onRetry: () => undefined,
  skeleton: <SkeletonLines rows={2} />,
};

describe("QueryBody", () => {
  it("shows the skeleton while nothing is loaded yet", () => {
    const { container } = render(
      <QueryBody {...base} data={undefined}>
        {() => <p>Loaded content</p>}
      </QueryBody>,
    );
    expect(screen.queryByText("Loaded content")).toBeNull();
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });

  it("shows the error with a working retry button when nothing is cached", () => {
    const onRetry = vi.fn();
    render(
      <QueryBody
        {...base}
        data={undefined}
        isError
        error={new ApiError("The key is missing.", { status: 503, code: "NOT_CONFIGURED", source: "weather" })}
        onRetry={onRetry}
        errorTitle="Weather is unavailable"
      >
        {() => <p>Loaded content</p>}
      </QueryBody>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Weather is unavailable");
    expect(screen.getByText("The key is missing.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state when the data has nothing to show", () => {
    render(
      <QueryBody
        {...base}
        data={{ items: [] as string[] }}
        isEmpty={(data) => data.items.length === 0}
        empty={<p>Nothing here yet</p>}
      >
        {() => <p>Loaded content</p>}
      </QueryBody>,
    );
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
  });

  it("renders the content when data is present", () => {
    render(
      <QueryBody {...base} data={{ value: 3 }}>
        {(data) => <p>Value is {data.value}</p>}
      </QueryBody>,
    );
    expect(screen.getByText("Value is 3")).toBeInTheDocument();
  });
});

describe("StaleNotice", () => {
  it("says how old the value is and that the source is not responding", () => {
    const now = Date.parse("2026-10-08T12:00:00Z");
    vi.useFakeTimers({ now });
    try {
      render(<StaleNotice fetchedAt="2026-10-08T11:48:00Z" />);
      expect(screen.getByRole("status")).toHaveTextContent("Updated 12 minutes ago");
      expect(screen.getByRole("status")).toHaveTextContent("not responding");
    } finally {
      vi.useRealTimers();
    }
  });
});
