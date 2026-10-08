import { Clock } from "lucide-react";

import { formatRelative } from "@/lib/format";
import { useNow } from "@/hooks/use-now";

/** Shown when an upstream failed and an older value is on screen (PRD F-11). */
export function StaleNotice({ fetchedAt }: { fetchedAt: string | undefined }) {
  const now = useNow();
  return (
    <p role="status" className="flex items-start gap-2 text-xs text-muted-foreground">
      <Clock className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span>
        Updated {formatRelative(fetchedAt, now)}. The source is not responding, so this may be
        out of date.
      </span>
    </p>
  );
}
