import { useReducedMotion } from "motion/react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatDay } from "@/lib/format";
import type { TrendPoint } from "@/types";

const chartConfig = {
  avg_temp_c: { label: "Temperature", color: "var(--chart-1)" },
  avg_aqi: { label: "AQI", color: "var(--chart-2)" },
} satisfies ChartConfig;

/** Dots show individual days while the series is short enough to count them. */
const DOT_LIMIT = 12;

function shortDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) {
    return day;
  }
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(
    new Date(year, month - 1, date),
  );
}

/** Pads the temperature range, so a single reading still gets a readable axis. */
function temperatureDomain(points: TrendPoint[]): [number, number] {
  const temps = points.flatMap((point) => (point.avg_temp_c === null ? [] : [point.avg_temp_c]));
  if (temps.length === 0) {
    return [0, 40];
  }
  return [Math.floor(Math.min(...temps) - 2), Math.ceil(Math.max(...temps) + 2)];
}

function summaryText(points: TrendPoint[]): string {
  if (points.length === 0) {
    return "No trend yet.";
  }
  if (points.length === 1) {
    return `Trend for ${formatDay(points[0].date)}.`;
  }
  return `Trend across ${points.length} days, from ${formatDay(points[0].date)} to ${formatDay(points[points.length - 1].date)}.`;
}

/** Daily averages. Temperature is read on the left axis, and AQI (1 to 5) on the right. */
export function TrendChart({ points }: { points: TrendPoint[] }) {
  const reduce = useReducedMotion();
  const showDots = points.length <= DOT_LIMIT;

  return (
    <div className="space-y-3">
      <ChartContainer config={chartConfig} className="h-72 w-full">
        <LineChart data={points} accessibilityLayer margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
            yAxisId="temp"
            domain={temperatureDomain(points)}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={(value: number) => `${Math.round(value)}°`}
          />
          <YAxis
            yAxisId="aqi"
            orientation="right"
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="avg_temp_c"
            stroke="var(--color-avg_temp_c)"
            strokeWidth={2}
            dot={showDots ? { r: 3, fill: "var(--color-avg_temp_c)", strokeWidth: 0 } : false}
            connectNulls
            isAnimationActive={!reduce}
          />
          <Line
            yAxisId="aqi"
            type="monotone"
            dataKey="avg_aqi"
            stroke="var(--color-avg_aqi)"
            strokeWidth={2}
            dot={showDots ? { r: 3, fill: "var(--color-avg_aqi)", strokeWidth: 0 } : false}
            connectNulls
            isAnimationActive={!reduce}
          />
        </LineChart>
      </ChartContainer>
      <p className="text-xs text-muted-foreground">{summaryText(points)}</p>
    </div>
  );
}
