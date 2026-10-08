import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  className?: string;
}

/** One headline number. The value is big and tabular; the hint gives context. */
export function StatCard({ label, value, hint, className }: StatCardProps) {
  return (
    <Card className={cn("bg-card/60 shadow-2xl shadow-black/40 backdrop-blur-2xl backdrop-saturate-150", className)}>
      <CardContent className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-3xl font-semibold tracking-tight tabular-nums text-balance">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
