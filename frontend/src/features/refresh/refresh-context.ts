/**
 * The opt-in refresh loop. Off by default: every refresh costs upstream API
 * calls, so the app never polls faster than the user asked it to.
 */

import { createContext, useContext, useState } from "react";

/** How often the pages re-fetch when auto-refresh is on. */
export const AUTO_REFRESH_MS = 60_000;

interface RefreshState {
  autoRefresh: boolean;
  setAutoRefresh: (value: boolean) => void;
}

const RefreshContext = createContext<RefreshState>({
  autoRefresh: false,
  setAutoRefresh: () => {},
});

export function useAutoRefresh(): RefreshState {
  return useContext(RefreshContext);
}

export { RefreshContext };
export type { RefreshState };
export function useRefreshState(): RefreshState {
  const [autoRefresh, setAutoRefresh] = useState(false);
  // useState's setter is stable, so the context value only changes
  // when the flag does.
  return { autoRefresh, setAutoRefresh };
}
