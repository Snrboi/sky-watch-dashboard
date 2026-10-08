import { Globe } from "lucide-react";

import { QueryBody } from "@/components/common/QueryBody";
import { SectionCard } from "@/components/common/SectionCard";
import { StaleNotice } from "@/components/common/StaleNotice";
import { IssMap } from "@/features/iss/IssMap";
import { useIssPosition } from "@/features/iss/use-iss";
import { formatCoordinates, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Place } from "@/types";

interface IssMapCardProps {
  place: Place;
  className?: string;
}

export function IssMapCard({ place, className }: IssMapCardProps) {
  const query = useIssPosition(place);
  const position = query.data;

  return (
    <SectionCard
      title="Live map"
      icon={Globe}
      className={className}
      description={`The blue marker is the ISS. The white dot is ${place.name}.`}
    >
      <QueryBody
        data={position}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="ISS position is unavailable"
        skeleton={
          <div className="rounded-xl border border-white/10 bg-black/25 p-3 sm:p-5">
            <IssMap position={undefined} place={place} />
          </div>
        }
      >
        {(iss) => (
          <div className="flex flex-col gap-4">
            {query.isError || iss.stale ? <StaleNotice fetchedAt={iss.fetched_at} /> : null}
            <div className={cn("rounded-xl border border-white/10 bg-black/25 p-3 sm:p-5")}>
              <IssMap position={iss} place={place} />
            </div>
            <p className="text-sm text-pretty text-muted-foreground">
              The ISS is {iss.region.replace("Roughly over", "roughly over")}, at{" "}
              {formatCoordinates(iss.lat, iss.lon)}
              {iss.altitude_km === null ? "" : `, about ${formatNumber(iss.altitude_km)} km up`}.
            </p>
          </div>
        )}
      </QueryBody>
    </SectionCard>
  );
}
