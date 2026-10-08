import { ArrowUpRight, Moon } from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { Metric } from "@/components/common/Metric";
import { QueryBody, SkeletonLines } from "@/components/common/QueryBody";
import { SectionCard } from "@/components/common/SectionCard";
import { StaleNotice } from "@/components/common/StaleNotice";
import { ratingVariant, riseText } from "@/features/iss/iss-format";
import { useIssPasses } from "@/features/iss/use-iss";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { Place } from "@/types";

interface NextPassCardProps {
  place: Place;
  className?: string;
}

/** The next visible pass for the Overview. */
export function NextPassCard({ place, className }: NextPassCardProps) {
  const query = useIssPasses(place, 3);
  const list = query.data;

  return (
    <SectionCard
      title="Next visible pass"
      icon={Moon}
      className={className}
      action={
        <Button variant="ghost" size="sm" asChild>
          <Link to="/iss">
            All passes
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </Button>
      }
    >
      <QueryBody
        data={list}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="Pass times are unavailable"
        skeleton={<SkeletonLines rows={3} />}
        isEmpty={(data) => data.passes.length === 0}
        empty={
          <EmptyState
            icon={Moon}
            title="No visible passes soon"
            description="Visible passes for this place show up here when they are predicted."
          />
        }
      >
        {(data) => {
          const next = data.passes[0];
          return (
            <div className="flex flex-col gap-5">
              {query.isError || data.stale ? <StaleNotice fetchedAt={data.fetched_at} /> : null}
              <div className="space-y-2">
                <p className="text-2xl font-semibold tracking-tight text-balance">
                  {formatDateTime(next.rise_at)}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={ratingVariant(next.rating)}>{next.rating_label}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {riseText(next)}
                  </span>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-4">
                <Metric label="Visible for" value={formatDuration(next.visible_duration_sec)} />
                <Metric
                  label="Highest point"
                  value={`${Math.round(next.max_elevation_deg)}°`}
                  hint="above the horizon"
                />
              </dl>
              {data.tle_stale ? (
                <p className="text-xs text-muted-foreground">
                  Orbit data is more than a day old, so pass times may drift.
                </p>
              ) : null}
            </div>
          );
        }}
      </QueryBody>
    </SectionCard>
  );
}
