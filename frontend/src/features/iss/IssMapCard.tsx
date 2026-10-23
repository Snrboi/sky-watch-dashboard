import { Globe } from "lucide-react";
import { lazy, Suspense } from "react";

import { QueryBody, SkeletonLines } from "@/components/common/QueryBody";
import { SectionCard } from "@/components/common/SectionCard";
import { StaleNotice } from "@/components/common/StaleNotice";
import { useIssPosition } from "@/features/iss/use-iss";
import { formatCoordinates, formatNumber } from "@/lib/format";
import type { Place } from "@/types";

// The globe pulls in three.js, so it loads after the page shell.
const GlobeMap = lazy(() =>
  import("@/features/iss/GlobeMap").then((module) => ({
    default: module.GlobeMap,
  })),
);

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
      description="NASA 8K Earth imagery where supported. Drag to rotate and use the controls or scroll to zoom; the pin marks you and the ship marks the ISS."
    >
      <QueryBody
        data={position}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="ISS position is unavailable"
        skeleton={
          <div className="rounded-xl border border-white/10 bg-black/25 p-3 sm:p-5">
            <Suspense
              fallback={
                <div className="aspect-[4/3] w-full rounded-xl bg-white/[0.03]">
                  <SkeletonLines rows={4} />
                </div>
              }
            >
              <GlobeMap position={undefined} place={place} />
            </Suspense>
          </div>
        }
      >
        {(iss) => (
          <div className="flex flex-col gap-4">
            {query.isError || iss.stale ? <StaleNotice fetchedAt={iss.fetched_at} /> : null}
            <Suspense
              fallback={
                <div className="aspect-[4/3] w-full rounded-xl bg-white/[0.03]">
                  <SkeletonLines rows={4} />
                </div>
              }
            >
              <GlobeMap position={iss} place={place} />
            </Suspense>
            <p className="text-sm text-pretty text-muted-foreground">
              The ISS is {iss.region.replace("Roughly over", "roughly over")}, at{" "}
              {formatCoordinates(iss.lat, iss.lon)}
              {iss.altitude_km === null ? "" : `, about ${formatNumber(iss.altitude_km)} km up`}.
            </p>
            <p className="-mt-3 text-[10px] text-muted-foreground/75">
              Earth imagery: NASA/GSFC Scientific Visualization Studio, Blue Marble data and global cloud composite.
            </p>
          </div>
        )}
      </QueryBody>
    </SectionCard>
  );
}
