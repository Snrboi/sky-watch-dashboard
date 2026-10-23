/**
 * A one-event .ics file for a pass, so it can land in any calendar app.
 * All times are written in UTC, which the .ics format calls for.
 */

import type { IssPass } from "@/types";

function stamp(iso: string | null | undefined): string {
  if (!iso) {
    return "";
  }
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function passIcs(pass: IssPass, placeName: string): string {
  const start = stamp(pass.visible_start ?? pass.rise_at);
  const end = stamp(pass.visible_end ?? pass.set_at ?? pass.rise_at);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sky Watch Dashboard//ISS pass//EN",
    "BEGIN:VEVENT",
    `UID:${pass.rise_at}-iss@skywatch`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:ISS visible pass over ${placeName}`,
    `DESCRIPTION:Highest ${Math.round(pass.max_elevation_deg)} degrees, ${pass.rating_label.toLowerCase()} pass. Rises ${pass.rise_compass ? `in the ${pass.rise_compass}` : ""}.`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

/** Downloads text as a file, in the browser, without a server round trip. */
export function downloadText(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
