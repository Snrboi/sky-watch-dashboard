import { motion, useReducedMotion } from "motion/react";
import { Wind } from "lucide-react";

import { Metric } from "@/components/common/Metric";
import { QueryBody, SkeletonLines } from "@/components/common/QueryBody";
import { SectionCard } from "@/components/common/SectionCard";
import { StaleNotice } from "@/components/common/StaleNotice";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { useAirQuality } from "@/features/air-quality/use-air-quality";
import { aqiStyle } from "@/lib/aqi";
import { EASE_OUT, MOTION, motionDuration } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Pollutants, Place } from "@/types";

interface AqiCardProps {
  place: Place;
  className?: string;
}

const POLLUTANT_LABELS: [keyof Pollutants, string][] = [
  ["pm2_5", "PM2.5"],
  ["pm10", "PM10"],
  ["o3", "O₃"],
  ["no2", "NO₂"],
  ["so2", "SO₂"],
  ["co", "CO"],
  ["nh3", "NH₃"],
  ["no", "NO"],
];

export function AqiCard({ place, className }: AqiCardProps) {
  const query = useAirQuality(place);
  const reading = query.data;

  return (
    <SectionCard
      title="Air quality"
      icon={Wind}
      className={className}
      description="Pollutants in µg/m³"
    >
      <QueryBody
        data={reading}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="Air quality is unavailable"
        skeleton={<SkeletonLines rows={4} />}
      >
        {(current) => (
          <div className="flex flex-col gap-6">
            {query.isError || current.stale ? <StaleNotice fetchedAt={current.fetched_at} /> : null}
            {current.aqi === null ? (
              <p className="text-sm text-muted-foreground">No air quality reading for this place.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-6">
                <AqiGauge value={current.aqi} token={current.color} />
                <div className="min-w-0 space-y-1">
                  <p className={cn("text-lg font-semibold", aqiStyle(current.color).text)}>
                    {current.label}
                  </p>
                  <p className="text-sm text-pretty text-muted-foreground">{current.advice}</p>
                </div>
              </div>
            )}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {POLLUTANT_LABELS.map(([key, label]) => (
                <Metric
                  key={key}
                  label={label}
                  value={<AnimatedNumber value={current.pollutants[key]} digits={1} />}
                />
              ))}
            </dl>
          </div>
        )}
      </QueryBody>
    </SectionCard>
  );
}

const ARC = "M 12 88 A 76 76 0 0 1 164 88";

/** A half-ring that fills to the AQI on load and on change (PRD 7.3). */
export function AqiGauge({ value, token }: { value: number; token: string | null | undefined }) {
  const reduce = useReducedMotion();
  const style = aqiStyle(token);
  const fraction = Math.min(Math.max(value, 1), 5) / 5;

  return (
    <div className="relative h-24 w-44 shrink-0" role="img" aria-label={`Air quality index ${value} out of 5`}>
      <svg viewBox="0 0 176 100" className="size-full overflow-visible" aria-hidden="true">
        <path
          d={ARC}
          pathLength={1}
          fill="none"
          strokeWidth={12}
          strokeLinecap="round"
          className="stroke-white/10"
        />
        <motion.path
          d={ARC}
          pathLength={1}
          fill="none"
          strokeWidth={12}
          strokeLinecap="round"
          className={style.stroke}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: fraction }}
          transition={{ duration: motionDuration(MOTION.gaugeSeconds, reduce), ease: EASE_OUT }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex items-baseline justify-center gap-1">
        <AnimatedNumber value={value} className={cn("text-4xl font-semibold", style.text)} />
        <span className="text-sm text-muted-foreground">/ 5</span>
      </div>
    </div>
  );
}
