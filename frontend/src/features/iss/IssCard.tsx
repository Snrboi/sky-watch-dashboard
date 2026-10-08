import { ArrowUpRight, Satellite } from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Metric } from "@/components/common/Metric";
import { QueryBody, SkeletonLines } from "@/components/common/QueryBody";
import { SectionCard } from "@/components/common/SectionCard";
import { StaleNotice } from "@/components/common/StaleNotice";
import { AnimatedNumber } from "@/components/motion/AnimatedNumber";
import { sunlitLabel } from "@/features/iss/iss-format";
import { useIssPosition } from "@/features/iss/use-iss";
import { formatCoordinates } from "@/lib/format";
import type { Place } from "@/types";

interface IssCardProps {
  place: Place;
  className?: string;
}

/** Compact ISS panel for the Overview. The full map lives on the ISS page. */
export function IssCard({ place, className }: IssCardProps) {
  const query = useIssPosition(place);
  const position = query.data;

  return (
    <SectionCard
      title="ISS now"
      icon={Satellite}
      className={className}
      action={
        <Button variant="ghost" size="sm" asChild>
          <Link to="/iss">
            Track
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </Button>
      }
    >
      <QueryBody
        data={position}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="ISS position is unavailable"
        skeleton={<SkeletonLines rows={3} />}
      >
        {(iss) => (
          <div className="flex flex-col gap-4">
            {query.isError || iss.stale ? <StaleNotice fetchedAt={iss.fetched_at} /> : null}
            <p className="text-base leading-snug font-medium text-pretty">{iss.region}</p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Metric label="Position" value={formatCoordinates(iss.lat, iss.lon)} />
              <Metric
                label="Distance from you"
                value={
                  iss.distance_km === null ? (
                    "—"
                  ) : (
                    <>
                      <AnimatedNumber value={iss.distance_km} /> km
                    </>
                  )
                }
                hint={`From ${place.name}`}
              />
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
              <Metric label="Light" value={sunlitLabel(iss.sunlit)} />
            </dl>
          </div>
        )}
      </QueryBody>
    </SectionCard>
  );
}
