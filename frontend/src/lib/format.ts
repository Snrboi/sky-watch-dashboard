/** Formatting helpers. Numbers use tabular figures in the UI; times use the viewer's timezone. */

const EM_DASH = "—";

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return EM_DASH;
  }
  return new Intl.NumberFormat("en", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatTemp(value: number | null | undefined, digits = 0): string {
  return value === null || value === undefined ? EM_DASH : `${formatNumber(value, digits)}°`;
}

export function formatKm(value: number | null | undefined): string {
  return value === null || value === undefined ? EM_DASH : `${formatNumber(value)} km`;
}

export function formatKmh(value: number | null | undefined): string {
  return value === null || value === undefined ? EM_DASH : `${formatNumber(value)} km/h`;
}

export function formatCoordinates(lat: number, lon: number): string {
  const latText = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? "N" : "S"}`;
  const lonText = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? "E" : "W"}`;
  return `${latText}, ${lonText}`;
}

/** Seconds as "4 min 41 s". Used for visible pass durations. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) {
    return EM_DASH;
  }
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  if (minutes === 0) {
    return `${rest} s`;
  }
  return rest === 0 ? `${minutes} min` : `${minutes} min ${rest} s`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) {
    return EM_DASH;
  }
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) {
    return EM_DASH;
  }
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

/** A date-only string such as "2026-10-07", without a timezone shift. */
export function formatDay(day: string | null | undefined): string {
  if (!day) {
    return EM_DASH;
  }
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) {
    return day;
  }
  return new Intl.DateTimeFormat("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, date));
}

/** "just now", "12 min ago", "3 h ago". Pass the current time in ms so the output is testable. */
export function formatRelative(iso: string | null | undefined, nowMs: number): string {
  if (!iso) {
    return EM_DASH;
  }
  const seconds = Math.round((new Date(iso).getTime() - nowMs) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const absolute = Math.abs(seconds);
  if (absolute < 45) {
    return "just now";
  }
  if (absolute < 3600) {
    return formatter.format(Math.round(seconds / 60), "minute");
  }
  if (absolute < 86400) {
    return formatter.format(Math.round(seconds / 3600), "hour");
  }
  return formatter.format(Math.round(seconds / 86400), "day");
}
