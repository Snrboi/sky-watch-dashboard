import { useReducedMotion } from "motion/react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { TrendPoint } from "@/types";

const chartConfig = {
  lookups: { label: "Lookups", color: "var(--chart-1)" },
} satisfies ChartConfig;

function shortDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) {
    return day;
  }
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(
    new Date(year, month - 1, date),
  );
}

/** How many lookups happened each day. */
export function LookupsChart({ points }: { points: TrendPoint[] }) {
  const reduce = useReducedMotion();
  return (
    <ChartContainer config={chartConfig} className="h-56 w-full">
      <BarChart data={points} accessibilityLayer margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid vertical={false} strokeOpacity={0.12} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDay}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={32}
          allowDecimals={false}
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
        <Bar
          dataKey="lookups"
          fill="var(--color-lookups)"
          radius={[4, 4, 0, 0]}
          isAnimationActive={!reduce}
        />
      </BarChart>
    </ChartContainer>
  );
}
