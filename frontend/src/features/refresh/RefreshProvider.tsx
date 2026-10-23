import type { ReactNode } from "react";

import { RefreshContext, useRefreshState } from "@/features/refresh/refresh-context";

/** Holds the auto-refresh choice for every data hook. */
export function RefreshProvider({ children }: { children: ReactNode }) {
  const value = useRefreshState();
  return <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>;
}
