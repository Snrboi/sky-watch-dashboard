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

/** Measures across this browser's lookups. Nulls are skipped, never fatal (PRD F-09). */
export default function StatsPage() {
  const query = useHistoryStats();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="This browser"
        title="Statistics"
        description="Measures across your lookups. Missing readings are skipped, not counted as zero."
      />
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
                  hint="UTC dates with at least one lookup"
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
                  label="Best air quality"
                  value={stats.best_aqi ? `AQI ${stats.best_aqi.aqi}` : "—"}
                  hint={
                    stats.best_aqi
                      ? `${stats.best_aqi.label} · ${formatDay(stats.best_aqi.date)}`
                      : "No air quality readings yet"
                  }
                />
              </Reveal>
              <Reveal index={6} className="h-full">
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
              <Reveal index={7} className="h-full">
                <StatCard
                  className="h-full"
                  label="Lookups with an upcoming pass"
                  value={<AnimatedNumber value={stats.lookups_with_pass} />}
                  hint="Lookups where an ISS pass was found"
                />
              </Reveal>
            </div>
            <SectionCard title="Trend" description="Daily averages of temperature and air quality">
              <TrendChart points={stats.trend} />
            </SectionCard>
          </div>
        )}
      </QueryBody>
    </div>
  );
}
