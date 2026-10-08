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
