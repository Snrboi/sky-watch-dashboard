import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface MetricProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}

/** A label above a measurement. Numbers use tabular figures. */
export function Metric({ label, value, hint, className }: MetricProps) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-base font-medium tabular-nums text-foreground">{value}</dd>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
