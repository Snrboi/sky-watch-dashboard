import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { QueryBody, SkeletonLines } from "@/components/common/QueryBody";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { ApodDetail } from "@/features/apod/ApodDetail";
import { useApod } from "@/features/apod/use-apod";
import { addDays } from "@/lib/dates";

/** The full APOD entry, with previous and next day. Dates run up to today (UTC). */
export default function PhotoPage() {
  const [day, setDay] = useState<string | undefined>(undefined);
  const query = useApod(day);
  const entry = query.data;
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const isToday = day === undefined || entry?.date === today;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="NASA"
        title="Photo of the day"
        description="Astronomy Picture of the Day. The same picture is the background, behind every page."
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
              <Button variant="ghost" size="sm" onClick={() => setDay(undefined)}>
                <RotateCcw aria-hidden="true" />
                Today
              </Button>
            )}
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
          {(current) => <ApodDetail entry={current} />}
        </QueryBody>
      </SectionCard>
    </div>
  );
}
