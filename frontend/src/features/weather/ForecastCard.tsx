import { ChevronLeft, ChevronRight, Hourglass } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { QueryBody, SkeletonLines } from "@/components/common/QueryBody";
import { SectionCard } from "@/components/common/SectionCard";
import { StaleNotice } from "@/components/common/StaleNotice";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { useForecast } from "@/features/weather/use-forecast";
import { formatTime24 } from "@/lib/format";
import { weatherIcon } from "@/lib/weather";
import type { Place } from "@/types";

interface ForecastCardProps {
  place: Place;
  className?: string;
}

/** The upcoming forecast, displayed with 24-hour local times. */
export function ForecastCard({ place, className }: ForecastCardProps) {
  const query = useForecast(place);
  const forecast = query.data;
  const stripRef = useRef<HTMLUListElement>(null);

  function slide(direction: 1 | -1) {
    stripRef.current?.scrollBy({
      left: direction * stripRef.current.clientWidth * 0.8,
      behavior: "smooth",
    });
  }

  return (
    <SectionCard
      title="Hourly Forecast"
      icon={Hourglass}
      className={className}
      action={
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Scroll the forecast back"
            onClick={() => slide(-1)}
            className="size-7"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Scroll the forecast forward"
            onClick={() => slide(1)}
            className="size-7"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      }
    >
      <QueryBody
        data={forecast}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="The forecast is unavailable"
        skeleton={<SkeletonLines rows={3} />}
      >
        {(data) => (
          <div className="flex flex-col gap-4">
            {query.isError || data.stale ? (
              <StaleNotice fetchedAt={data.fetched_at} />
            ) : null}
            <ul
              ref={stripRef}
              aria-label="Hourly forecast"
              className="no-scrollbar flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1"
            >
              {data.points.map((point) => {
                const Icon = weatherIcon(point.icon);
                return (
                  <li
                    key={point.at}
                    className="flex w-24 shrink-0 snap-center flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2 py-4"
                  >
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatTime24(point.at)}
                    </span>
                    <Icon className="size-6 text-sky" aria-hidden="true" />
                    <span className="text-xs text-pretty text-muted-foreground">
                      {point.description}
                    </span>
                    <p className="text-lg font-semibold tabular-nums">
                      <AnimatedNumber value={point.temp_c} />
                      <span aria-hidden="true">°</span>
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </QueryBody>
    </SectionCard>
  );
}
