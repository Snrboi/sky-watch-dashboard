import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CalendarClock, CalendarPlus, ChevronDown, Moon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { Metric } from "@/components/common/Metric";
import { QueryBody, SkeletonLines } from "@/components/common/QueryBody";
import { SectionCard } from "@/components/common/SectionCard";
import { StaleNotice } from "@/components/common/StaleNotice";
import {
  formatCountdown,
  passTimeOfDay,
  ratingVariant,
  riseText,
} from "@/features/iss/iss-format";
import { downloadText, passIcs } from "@/features/iss/pass-calendar";
import { useIssPasses } from "@/features/iss/use-iss";
import { useNow } from "@/hooks/use-now";
import { formatDateTime, formatDuration, formatTime } from "@/lib/format";
import { EASE_OUT, MOTION, motionDuration } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { IssPass, Place } from "@/types";

interface IssPassesCardProps {
  place: Place;
  className?: string;
}

/**
 * The pass list is also the non-visual version of the map (PRD 7.4). Each row shows
 * the essentials, says whether it is a morning or evening pass, and expands for the
 * full timing. Any row can go straight into a calendar file.
 */
export function IssPassesCard({ place, className }: IssPassesCardProps) {
  const query = useIssPasses(place, 5);
  const list = query.data;
  const now = useNow(30_000);

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
                <PassRow
                  key={pass.rise_at}
                  pass={pass}
                  placeName={place.name}
                  now={now}
                />
              ))}
            </ul>
            {data.tle_stale ? (
              <p className="text-xs text-muted-foreground">
                Orbit data is more than a day old, so pass times may drift.
              </p>
            ) : null}
          </div>
        )}
      </QueryBody>
    </SectionCard>
  );
}

function PassRow({
  pass,
  placeName,
  now,
}: {
  pass: IssPass;
  placeName: string;
  now: number;
}) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const panelId = `pass-${pass.rise_at}`;
  const countdown = formatCountdown(pass.rise_at, now);
  const timeOfDay = passTimeOfDay(pass.rise_at);

  function saveToCalendar() {
    downloadText(
      `iss-pass-${pass.rise_at.slice(0, 10)}.ics`,
      passIcs(pass, placeName),
      "text/calendar",
    );
  }

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
          <span className="block font-medium tabular-nums">
            {formatDateTime(pass.rise_at)}
            <span className="ml-2 text-xs font-normal text-muted-foreground capitalize">
              {timeOfDay} pass
            </span>
          </span>
          <span className="block text-xs text-muted-foreground">
            {riseText(pass)} · highest {Math.round(pass.max_elevation_deg)}° ·{" "}
            {formatDuration(pass.visible_duration_sec)} visible
            {countdown ? ` · ${countdown}` : ""}
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
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Metric label="Visible from" value={formatTime(pass.visible_start)} />
                <Metric label="Visible until" value={formatTime(pass.visible_end)} />
                <Metric label="Highest point" value={`${Math.round(pass.max_elevation_deg)}° at ${formatTime(pass.culmination_at)}`} />
                <Metric label="Sets" value={formatTime(pass.set_at)} hint={pass.set_at ? "below the horizon" : undefined} />
              </dl>
              <Button
                variant="outline"
                size="sm"
                onClick={saveToCalendar}
                aria-label={`Add the pass on ${pass.rise_at} to a calendar`}
              >
                <CalendarPlus aria-hidden="true" />
                Add to calendar
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}
