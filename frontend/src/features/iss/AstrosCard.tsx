import { Users } from "lucide-react";

import { QueryBody, SkeletonLines } from "@/components/common/QueryBody";
import { SectionCard } from "@/components/common/SectionCard";
import { StaleNotice } from "@/components/common/StaleNotice";
import { useAstros } from "@/features/iss/use-iss";

interface AstrosCardProps {
  className?: string;
}

/** A responsive crew roster, with no more than four people on each row. */
export function AstrosCard({ className }: AstrosCardProps) {
  const query = useAstros();
  const roster = query.data;

  return (
    <SectionCard
      title="People in space"
      icon={Users}
      className={className}
      action={
        roster ? (
          <span className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs font-medium tabular-nums text-muted-foreground">
            {roster.count} {roster.count === 1 ? "person" : "people"}
          </span>
        ) : null
      }
    >
      <QueryBody
        data={roster}
        isError={query.isError}
        error={query.error}
        onRetry={() => void query.refetch()}
        errorTitle="The roster is unavailable"
        skeleton={<SkeletonLines rows={2} />}
      >
        {(data) => (
          <div className="flex min-w-0 flex-col gap-3">
            {query.isError || data.stale ? <StaleNotice fetchedAt={data.fetched_at} /> : null}
            <ul
              aria-label="Astronauts currently in space"
              className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4"
            >
              {data.people.map((person) => (
                <li
                  key={person.name}
                  className="flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] py-1.5 pl-1.5 pr-3"
                >
                  <AstronautAvatar name={person.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium leading-tight">
                      {person.name}
                    </span>
                    <span className="block truncate text-xs leading-tight text-muted-foreground">
                      {person.craft}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </QueryBody>
    </SectionCard>
  );
}

/** A drawn helmet avatar; the roster API does not provide astronaut photos. */
function AstronautAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      role="img"
      aria-label={`${name}, astronaut`}
      className="grid size-9 shrink-0 place-items-center rounded-full border border-sky/30 bg-sky/10"
    >
      <svg viewBox="0 0 24 24" className="size-6 text-sky" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M4.5 11a7.5 7.5 0 0 1 15 0v1.5a4.5 4.5 0 0 1-4.5 4.5h-6A4.5 4.5 0 0 1 4.5 12.5Z"
          fill="currentColor"
          opacity="0.35"
        />
        <path d="M9 13.5h6v2.2a3 3 0 0 1-6 0Z" fill="currentColor" opacity="0.55" />
      </svg>
      <span className="sr-only">{initial}</span>
    </span>
  );
}
