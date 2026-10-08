import { ArrowUpRight, Image as ImageIcon } from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { QueryBody, SkeletonLines } from "@/components/common/QueryBody";
import { SectionCard } from "@/components/common/SectionCard";
import { useApod } from "@/features/apod/use-apod";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PhotoCardProps {
  className?: string;
}

/** Teaser for today's NASA picture. The full entry is on the Photo page. */
export function PhotoCard({ className }: PhotoCardProps) {
  const query = useApod();
  const entry = query.data;

  return (
    <SectionCard
      title="Photo of the day"
      icon={ImageIcon}
      className={cn(className)}
      action={
        <Button variant="ghost" size="sm" asChild>
          <Link to="/photo">
            Open
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </Button>
      }
    >
      <QueryBody
        data={entry}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="Photo of the day is unavailable"
        skeleton={<SkeletonLines rows={3} />}
      >
        {(current) => (
          <div className="space-y-2">
            <p className="font-medium text-balance">{current.title}</p>
            <p className="text-xs text-muted-foreground">
              {formatDay(current.date)} · {current.copyright ?? "NASA APOD"}
            </p>
            {current.is_placeholder ? (
              <p className="text-sm text-muted-foreground">
                NASA has no picture for this date yet. The background uses a generated sky instead.
              </p>
            ) : (
              <p className="line-clamp-3 text-sm text-pretty text-muted-foreground">
                {current.explanation}
              </p>
            )}
          </div>
        )}
      </QueryBody>
    </SectionCard>
  );
}
