import { ChartNoAxesColumn } from "lucide-react";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBody, SkeletonLines } from "@/components/common/QueryBody";
import { SectionCard } from "@/components/common/SectionCard";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { Reveal } from "@/components/motion/Reveal";
import { useHistoryStats } from "@/features/history/use-history";
import { StatCard } from "@/features/stats/StatCard";
import { TrendChart } from "@/features/stats/TrendChart";
import { formatDay } from "@/lib/format";
function countOf(value: number, noun: string): string {
  return `${value} ${noun}${value === 1 ? "" : "s"}`;
}

/** Summary measures and daily trends from saved lookups (PRD F-09). */
export default function StatsPage() {
  const query = useHistoryStats();

  return (
    <div className="space-y-8">
      <PageHeader title="Statistics" />
      <QueryBody
        data={query.data}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="Statistics are unavailable"
        skeleton={<SkeletonLines rows={6} />}
        isEmpty={(stats) => stats.total_lookups === 0}
        empty={
          <EmptyState
            icon={ChartNoAxesColumn}
            title="No statistics yet"
            description="Statistics appear after your first lookup."
          />
        }
      >
        {(stats) => (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Reveal index={0} className="h-full">
                <StatCard
                  className="h-full"
                  label="Total lookups"
                  value={<AnimatedNumber value={stats.total_lookups} />}
                />
              </Reveal>
              <Reveal index={1} className="h-full">
                <StatCard
                  className="h-full"
                  label="Days active"
                  value={<AnimatedNumber value={stats.days_active} />}
                />
              </Reveal>
              <Reveal index={2} className="h-full">
                <StatCard
                  className="h-full"
                  label="Unique cities"
                  value={<AnimatedNumber value={stats.unique_cities} />}
                />
              </Reveal>
              <Reveal index={3} className="h-full">
                <StatCard
                  className="h-full"
                  label="Most searched"
                  value={stats.most_searched_city?.city ?? "—"}
                  hint={
                    stats.most_searched_city
                      ? countOf(stats.most_searched_city.lookups, "lookup")
                      : undefined
                  }
                />
              </Reveal>
              <Reveal index={4} className="h-full">
                <StatCard
                  className="h-full"
                  label="Average temperature"
                  value={
                    stats.average_temp_c === null ? (
                      "—"
                    ) : (
                      <>
                        <AnimatedNumber value={stats.average_temp_c} digits={1} />°C
                      </>
                    )
                  }
                  hint={stats.average_temp_c === null ? "No temperature readings yet" : undefined}
                />
              </Reveal>
              <Reveal index={5} className="h-full">
                <StatCard
                  className="h-full"
                  label="Coldest"
                  value={
                    stats.coldest === null ? (
                      "—"
                    ) : (
                      <AnimatedNumber value={stats.coldest.temp_c} digits={1} />
                    )
                  }
                  hint={stats.coldest ? `${stats.coldest.temp_c}°C on ${formatDay(stats.coldest.date)}` : "No temperature readings yet"}
                />
              </Reveal>
              <Reveal index={6} className="h-full">
                <StatCard
                  className="h-full"
                  label="Warmest"
                  value={
                    stats.warmest === null ? (
                      "—"
                    ) : (
                      <AnimatedNumber value={stats.warmest.temp_c} digits={1} />
                    )
                  }
                  hint={stats.warmest ? `${stats.warmest.temp_c}°C on ${formatDay(stats.warmest.date)}` : "No temperature readings yet"}
                />
              </Reveal>
              <Reveal index={7} className="h-full">
                <StatCard
                  className="h-full"
                  label="Best air quality"
                  value={stats.best_aqi ? `AQI ${stats.best_aqi.aqi}` : "—"}
                  hint={
                    stats.best_aqi
                      ? `${stats.best_aqi.label} · ${formatDay(stats.best_aqi.date)}`
                      : "No air quality readings yet"
                  }
                />
              </Reveal>
              <Reveal index={8} className="h-full">
                <StatCard
                  className="h-full"
                  label="Worst air quality"
                  value={stats.worst_aqi ? `AQI ${stats.worst_aqi.aqi}` : "—"}
                  hint={
                    stats.worst_aqi
                      ? `${stats.worst_aqi.label} · ${formatDay(stats.worst_aqi.date)}`
                      : "No air quality readings yet"
                  }
                />
              </Reveal>
              <Reveal index={9} className="h-full">
                <StatCard
                  className="h-full"
                  label="Lookups with an upcoming pass"
                  value={<AnimatedNumber value={stats.lookups_with_pass} />}
                  hint="Lookups where an ISS pass was found"
                />
              </Reveal>
              <Reveal index={10} className="h-full">
                <StatCard
                  className="h-full"
                  label="Busiest hour"
                  value={stats.peak_hour_utc === null ? "—" : `${stats.peak_hour_utc.toString().padStart(2, "0")}:00 UTC`}
                  hint="When you look most"
                />
              </Reveal>
            </div>
            <SectionCard title="Trend">
              <TrendChart points={stats.trend} />
            </SectionCard>
          </div>
        )}
      </QueryBody>
    </div>
  );
}
