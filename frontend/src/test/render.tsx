import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import { MotionConfig } from "motion/react";
import { MemoryRouter } from "react-router";
import type { ReactNode } from "react";

import App from "@/App";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocationProvider } from "@/features/location/LocationProvider";
import { createQueryClient } from "@/lib/query-client";
import { DEFAULT_PLACE } from "@/lib/storage";
import type { Place } from "@/types";

export interface RenderOptions {
  route?: string;
  place?: Place;
  queryClient?: QueryClient;
}

export function Providers({
  children,
  route = "/",
  place = DEFAULT_PLACE,
  queryClient,
}: RenderOptions & { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient ?? createQueryClient()}>
      <MotionConfig reducedMotion="always">
        <MemoryRouter initialEntries={[route]}>
          <LocationProvider initialPlace={place}>
            <TooltipProvider>{children}</TooltipProvider>
          </LocationProvider>
        </MemoryRouter>
      </MotionConfig>
    </QueryClientProvider>
  );
}

/** Render the whole app at a route, with the same providers as production. */
export function renderApp(options: RenderOptions = {}): RenderResult {
  return render(
    <Providers {...options}>
      <App />
    </Providers>,
  );
}
