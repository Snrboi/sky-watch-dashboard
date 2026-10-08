import { Thermometer } from "lucide-react";

import { Metric } from "@/components/common/Metric";
import { QueryBody, SkeletonLines } from "@/components/common/QueryBody";
import { SectionCard } from "@/components/common/SectionCard";
import { StaleNotice } from "@/components/common/StaleNotice";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { useWeather } from "@/features/weather/use-weather";
import { weatherIcon } from "@/lib/weather";
import type { Place } from "@/types";

interface WeatherCardProps {
  place: Place;
  className?: string;
}

export function WeatherCard({ place, className }: WeatherCardProps) {
  const query = useWeather(place);
  const weather = query.data;
  const Icon = weatherIcon(weather?.icon);

  return (
    <SectionCard title="Weather" icon={Thermometer} className={className}>
      <QueryBody
        data={weather}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="Weather is unavailable"
        skeleton={<SkeletonLines rows={3} />}
      >
        {(current) => (
          <div className="flex flex-col gap-6">
            {query.isError || current.stale ? <StaleNotice fetchedAt={current.fetched_at} /> : null}
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <Icon className="size-10 text-sky" aria-hidden="true" />
                  <p className="text-6xl font-semibold tracking-tight sm:text-7xl">
                    <AnimatedNumber value={current.temp_c} />
                    <span aria-hidden="true">°</span>
                    <span className="sr-only"> degrees Celsius</span>
                  </p>
                </div>
                <p className="text-base text-muted-foreground">{current.description}</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Feels like{" "}
                <span className="text-foreground">
                  <AnimatedNumber value={current.feels_like_c} />°
                </span>
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Metric
                label="Humidity"
                value={
                  <>
                    <AnimatedNumber value={current.humidity_pct} />%
                  </>
                }
              />
              <Metric
                label="Wind"
                value={
                  <>
                    <AnimatedNumber value={current.wind_kph} /> km/h
                  </>
                }
              />
              <Metric label="Condition" value={current.condition} />
            </dl>
          </div>
        )}
      </QueryBody>
    </SectionCard>
  );
}
