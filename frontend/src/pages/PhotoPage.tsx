import { CalendarDays, ChevronLeft, ChevronRight, Dices, RotateCcw } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { QueryBody, SkeletonLines } from "@/components/common/QueryBody";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApodDetail } from "@/features/apod/ApodDetail";
import { useApod } from "@/features/apod/use-apod";
import { addDays } from "@/lib/dates";

/** The full APOD entry, with previous and next day. Dates run up to today (UTC). */
export default function PhotoPage() {
  const [day, setDay] = useState<string | undefined>(undefined);
  const [random, setRandom] = useState(false);
  const query = useApod(day, random);
  const entry = query.data;
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const isToday = !random && (day === undefined || entry?.date === today);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="NASA"
        title="Photo of the day"
        description="NASA's Astronomy Picture of the Day."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous day"
              disabled={!entry}
              onClick={() => entry && setDay(addDays(entry.date, -1))}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next day"
              disabled={!entry || entry.date >= today}
              onClick={() => entry && setDay(addDays(entry.date, 1))}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
            {isToday ? null : (
              <Button variant="ghost" size="sm" onClick={() => { setDay(undefined); setRandom(false); }}>
                <RotateCcw aria-hidden="true" />
                Today
              </Button>
            )}
            <Input
              type="date"
              aria-label="Pick a date"
              value={random ? "" : day ?? today}
              max={today}
              min="1995-06-16"
              onChange={(event) => {
                const value = event.target.value;
                if (value) {
                  setRandom(false);
                  setDay(value);
                }
              }}
              className="h-8 w-40 border-white/10 bg-white/5"
            />
            <Button
              variant="outline"
              size="sm"
              aria-pressed={random}
              onClick={() => setRandom(true)}
            >
              <Dices aria-hidden="true" />
              Random
            </Button>
          </div>
        }
      />
      <SectionCard title="NASA picture" bodyClassName="p-0 sm:p-0">
        <QueryBody
          data={entry}
          isError={query.isError}
          error={query.error}
          onRetry={() => void query.refetch()}
          errorTitle="The photo is unavailable"
          skeleton={<div className="p-6"><SkeletonLines rows={6} /></div>}
        >
          {(current) => (
            <>
              {random ? (
                <p className="flex items-center gap-2 border-b border-white/10 px-6 py-3 text-xs text-muted-foreground">
                  <CalendarDays aria-hidden="true" className="size-3.5" />
                  A random pick from NASA's archive.
                </p>
              ) : null}
              <ApodDetail entry={current} />
            </>
          )}
        </QueryBody>
      </SectionCard>
    </div>
  );
}
