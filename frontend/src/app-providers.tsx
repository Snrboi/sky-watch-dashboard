import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { BrowserRouter } from "react-router";
import type { ReactNode } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { LocationProvider } from "@/features/location/LocationProvider";
import { RefreshProvider } from "@/features/refresh/RefreshProvider";

interface AppProvidersProps {
  children: ReactNode;
  queryClient: QueryClient;
}

/** Every provider the app needs, in one place. Tests use the same tree. */
export function AppProviders({ children, queryClient }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <LocationProvider>
            <RefreshProvider>
              <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
            </RefreshProvider>
          </LocationProvider>
        </BrowserRouter>
      </MotionConfig>
    </QueryClientProvider>
  );
}
