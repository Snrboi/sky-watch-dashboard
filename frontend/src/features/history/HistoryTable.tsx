import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { aqiStyle, tokenForAqi } from "@/lib/aqi";
import { formatDateTime, formatTemp } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LookupEntry } from "@/types";

export function HistoryTable({ entries }: { entries: LookupEntry[] }) {
  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <Table>
        <TableCaption className="sr-only">Past lookups, newest first.</TableCaption>
        <TableHeader>
          <TableRow className="border-white/10 hover:bg-transparent">
            <TableHead scope="col">When</TableHead>
            <TableHead scope="col">City</TableHead>
            <TableHead scope="col" className="text-right">Temp</TableHead>
            <TableHead scope="col">AQI</TableHead>
            <TableHead scope="col">Next pass</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const token = tokenForAqi(entry.aqi);
            return (
              <TableRow key={entry.id} className="border-white/10">
                <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                  {formatDateTime(entry.recorded_at)}
                </TableCell>
                <TableCell>
                  <span className="font-medium">{entry.city}</span>
                  {entry.state || entry.country ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · {[entry.state, entry.country].filter(Boolean).join(", ")}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatTemp(entry.temp_c)}</TableCell>
                <TableCell>
                  {entry.aqi === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <Badge variant="outline" className={cn("gap-1.5 border-white/10 tabular-nums", aqiStyle(token).text)}>
                      <span aria-hidden="true" className={cn("size-1.5 rounded-full bg-current")} />
                      AQI {entry.aqi}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                  {formatDateTime(entry.next_pass_at)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
