import type { IssPass } from "@/types";

export function sunlitLabel(sunlit: boolean | null | undefined): string {
  if (sunlit === null || sunlit === undefined) {
    return "—";
  }
  return sunlit ? "Sunlit" : "In Earth's shadow";
}

export function riseText(pass: Pick<IssPass, "rise_compass">): string {
  return pass.rise_compass ? `Rises in the ${pass.rise_compass}` : "Rises";
}

export function ratingVariant(rating: IssPass["rating"]): "default" | "outline" | "secondary" {
  if (rating === "excellent") {
    return "default";
  }
  return rating === "good" ? "outline" : "secondary";
}

/** "morning", "evening", or "night" for the viewer's clock. */
export function passTimeOfDay(riseAt: string): "morning" | "evening" | "night" {
  const hour = new Date(riseAt).getHours();
  if (hour >= 4 && hour < 12) {
    return "morning";
  }
  if (hour >= 16 && hour < 22) {
    return "evening";
  }
  return "night";
}

/** Milliseconds as "in 6 h 12 m", "in 41 min", or "in 20 s". Null when past. */
export function formatCountdown(riseAt: string | null | undefined, nowMs: number): string | null {
  if (!riseAt) {
    return null;
  }
  const milliseconds = new Date(riseAt).getTime() - nowMs;
  if (milliseconds <= 0) {
    return null;
  }
  const seconds = Math.floor(milliseconds / 1000);
  if (seconds < 90) {
    return `in ${seconds} s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `in ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `in ${hours} h` : `in ${hours} h ${rest} min`;
}
