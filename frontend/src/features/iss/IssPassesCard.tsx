import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarClock, ChevronDown, Moon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { Metric } from "@/components/common/Metric";
import { QueryBody, SkeletonLines } from "@/components/common/QueryBody";
import { SectionCard } from "@/components/common/SectionCard";
import { StaleNotice } from "@/components/common/StaleNotice";
import { ratingVariant, riseText } from "@/features/iss/iss-format";
import { useIssPasses } from "@/features/iss/use-iss";
import { formatDateTime, formatDuration, formatTime } from "@/lib/format";
import { EASE_OUT, MOTION, motionDuration } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { IssPass, Place } from "@/types";

interface IssPassesCardProps {
  place: Place;
  className?: string;
}

/**
 * The pass list is also the non-visual version of the map (PRD 7.4). Each row shows the essentials
 * and expands for the full timing.
 */
export function IssPassesCard({ place, className }: IssPassesCardProps) {
  const query = useIssPasses(place, 5);
  const list = query.data;

  return (
    <SectionCard
      title="Upcoming visible passes"
      icon={CalendarClock}
      className={className}
      description={`For ${place.name}. Times are in your timezone.`}
    >
      <QueryBody
        data={list}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="Pass times are unavailable"
        skeleton={<SkeletonLines rows={4} />}
        isEmpty={(data) => data.passes.length === 0}
        empty={
          <EmptyState
            icon={Moon}
            title="No visible passes in the next few days"
            description="The ISS may pass over this place, but not in a way you can see from the ground."
          />
        }
      >
        {(data) => (
          <div className="flex flex-col gap-4">
            {query.isError || data.stale ? <StaleNotice fetchedAt={data.fetched_at} /> : null}
            <ul className="flex flex-col">
              {data.passes.map((pass) => (
                <PassRow key={pass.rise_at} pass={pass} />
              ))}
            </ul>
            {data.tle_stale ? (
              <p className="text-xs text-muted-foreground">
                Orbit data is more than a day old, so pass times may drift by a few minutes.
              </p>
            ) : null}
          </div>
        )}
      </QueryBody>
    </SectionCard>
  );
}

function PassRow({ pass }: { pass: IssPass }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const panelId = `pass-${pass.rise_at}`;

  return (
    <li className="border-t border-white/10 first:border-t-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 rounded-lg py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="min-w-0 space-y-1">
          <span className="block font-medium tabular-nums">{formatDateTime(pass.rise_at)}</span>
          <span className="block text-xs text-muted-foreground">
            {riseText(pass)} · highest {Math.round(pass.max_elevation_deg)}° ·{" "}
            {formatDuration(pass.visible_duration_sec)} visible
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <Badge variant={ratingVariant(pass.rating)}>{pass.rating_label}</Badge>
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
          />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: motionDuration(MOTION.expandSeconds, reduce), ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <dl className="grid grid-cols-2 gap-4 pb-4 sm:grid-cols-4">
              <Metric label="Visible from" value={formatTime(pass.visible_start)} />
              <Metric label="Visible until" value={formatTime(pass.visible_end)} />
              <Metric label="Highest point" value={`${Math.round(pass.max_elevation_deg)}° at ${formatTime(pass.culmination_at)}`} />
              <Metric label="Sets" value={formatTime(pass.set_at)} hint={pass.set_at ? "below the horizon" : undefined} />
            </dl>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}
