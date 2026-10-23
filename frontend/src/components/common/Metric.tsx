import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface MetricProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  dense?: boolean;
  className?: string;
}

/** A label above a measurement. Numbers use tabular figures. */
export function Metric({ label, value, hint, dense = false, className }: MetricProps) {
  return (
    <div className={cn("min-w-0", dense ? "space-y-0.5" : "space-y-1", className)}>
      <dt className={cn("break-words text-pretty text-xs text-muted-foreground", dense && "text-[10px] leading-tight")}>{label}</dt>
      <dd className={cn("break-words font-medium tabular-nums text-pretty text-foreground", dense ? "text-sm" : "text-base")}>{value}</dd>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
