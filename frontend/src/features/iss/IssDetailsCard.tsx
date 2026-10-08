import { Satellite } from "lucide-react";

import { Metric } from "@/components/common/Metric";
import { QueryBody, SkeletonLines } from "@/components/common/QueryBody";
import { SectionCard } from "@/components/common/SectionCard";
import { StaleNotice } from "@/components/common/StaleNotice";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { sunlitLabel } from "@/features/iss/iss-format";
import { useIssPosition } from "@/features/iss/use-iss";
import { formatCoordinates, formatTime } from "@/lib/format";
import type { Place } from "@/types";

interface IssDetailsCardProps {
  place: Place;
  className?: string;
}

export function IssDetailsCard({ place, className }: IssDetailsCardProps) {
  const query = useIssPosition(place);
  const position = query.data;

  return (
    <SectionCard title="Position details" icon={Satellite} className={className}>
      <QueryBody
        data={position}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="ISS position is unavailable"
        skeleton={<SkeletonLines rows={5} />}
      >
        {(iss) => (
          <div className="flex flex-col gap-5">
            {query.isError || iss.stale ? <StaleNotice fetchedAt={iss.fetched_at} /> : null}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
              <Metric label="Coordinates" value={formatCoordinates(iss.lat, iss.lon)} />
              <Metric label="Light" value={sunlitLabel(iss.sunlit)} />
              <Metric
                label="Altitude"
                value={
                  iss.altitude_km === null ? (
                    "—"
                  ) : (
                    <>
                      <AnimatedNumber value={iss.altitude_km} /> km
                    </>
                  )
                }
              />
              <Metric
                label="Speed"
                value={
                  iss.velocity_kmh === null ? (
                    "—"
                  ) : (
                    <>
                      <AnimatedNumber value={iss.velocity_kmh} /> km/h
                    </>
                  )
                }
              />
              <Metric
                label={`Distance from ${place.name}`}
                value={
                  iss.distance_km === null ? (
                    "—"
                  ) : (
                    <>
                      <AnimatedNumber value={iss.distance_km} /> km
                    </>
                  )
                }
              />
              <Metric label="Observed" value={formatTime(iss.observed_at)} />
            </dl>
            <p className="text-xs text-pretty text-muted-foreground">
              Source: {iss.source}. Distance is measured across the ground, from the point directly
              below the station to {place.name}.
            </p>
          </div>
        )}
      </QueryBody>
    </SectionCard>
  );
}
