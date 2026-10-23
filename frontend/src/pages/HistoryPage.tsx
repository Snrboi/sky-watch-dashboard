import { Download, History, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { QueryBody, SkeletonLines } from "@/components/common/QueryBody";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HistoryTable } from "@/features/history/HistoryTable";
import { downloadHistoryCsv, useDeleteHistory, useHistory } from "@/features/history/use-history";

/** Recent saved lookups with a city filter (PRD F-08). */
export default function HistoryPage() {
  const query = useHistory();
  const [filter, setFilter] = useState("");
  const [confirming, setConfirming] = useState(false);
  const remove = useDeleteHistory();

  function exportCsv() {
    void downloadHistoryCsv().catch(() => {
      // The download failing is visible in the browser; nothing to show inline.
    });
  }

  function clearHistory() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    remove.mutate();
  }

  return (
    <div className="space-y-8">
      <PageHeader title="History" />
      <SectionCard
        title="Lookups"
        icon={History}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download aria-hidden="true" />
              CSV
            </Button>
            <Button
              variant={confirming ? "destructive" : "outline"}
              size="sm"
              onClick={clearHistory}
              disabled={remove.isPending || query.data?.entries.length === 0}
            >
              <Trash2 aria-hidden="true" />
              {confirming ? "Confirm clear" : "Clear"}
            </Button>
            <Input
              type="search"
              aria-label="Filter by city"
              placeholder="Filter by city"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="h-8 w-44 border-white/10 bg-white/5"
            />
          </div>
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
