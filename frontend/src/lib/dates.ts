/** Date-only strings ("2026-10-07") shifted by whole days, without timezone drift. */
export function addDays(day: string, offset: number): string {
  const [year, month, date] = day.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, date + offset));
  return shifted.toISOString().slice(0, 10);
}
