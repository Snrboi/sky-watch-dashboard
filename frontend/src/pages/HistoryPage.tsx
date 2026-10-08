import { History } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBody, SkeletonLines } from "@/components/common/QueryBody";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HistoryTable } from "@/features/history/HistoryTable";
import { useHistory } from "@/features/history/use-history";

/** Lookups in this browser, newest first, with a city filter (PRD F-08). */
export default function HistoryPage() {
  const query = useHistory();
  const [filter, setFilter] = useState("");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="This browser"
        title="History"
        description="Your recent lookups, newest first. A place is saved at most once every 30 minutes."
      />
      <SectionCard
        title="Lookups"
        icon={History}
        action={
          <Input
            type="search"
            aria-label="Filter by city"
            placeholder="Filter by city"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="h-8 w-44 border-white/10 bg-white/5"
          />
        }
      >
        <QueryBody
          data={query.data}
          isError={query.isError}
          error={query.error}
          onRetry={() => void query.refetch()}
          errorTitle="History is unavailable"
          skeleton={<SkeletonLines rows={5} />}
          isEmpty={(data) => data.entries.length === 0}
          empty={
            <EmptyState
              icon={History}
              title="No lookups yet"
              description="Your city is saved here automatically when you open the Overview."
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link to="/">Go to the Overview</Link>
                </Button>
              }
            />
          }
        >
          {(list) => {
            const wanted = filter.trim().toLowerCase();
            const entries = wanted
              ? list.entries.filter((entry) => entry.city.toLowerCase().includes(wanted))
              : list.entries;
            return entries.length > 0 ? (
              <HistoryTable entries={entries} />
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No lookups match “{filter.trim()}”.
              </p>
            );
          }}
        </QueryBody>
      </SectionCard>
    </div>
  );
}
