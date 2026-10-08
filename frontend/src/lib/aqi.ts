/**
 * AQI colour tokens (from the API) mapped to Tailwind classes. The label text comes from the API,
 * so it lives in one place. These colours mean AQI and nothing else.
 */

export interface AqiStyle {
  text: string;
  soft: string;
  stroke: string;
  fill: string;
}

const NEUTRAL: AqiStyle = {
  text: "text-muted-foreground",
  soft: "bg-muted text-muted-foreground",
  stroke: "stroke-muted-foreground",
  fill: "fill-muted-foreground",
};

const STYLES: Record<string, AqiStyle> = {
  good: {
    text: "text-aqi-good",
    soft: "bg-aqi-good/15 text-aqi-good",
    stroke: "stroke-aqi-good",
    fill: "fill-aqi-good",
  },
  fair: {
    text: "text-aqi-fair",
    soft: "bg-aqi-fair/15 text-aqi-fair",
    stroke: "stroke-aqi-fair",
    fill: "fill-aqi-fair",
  },
  moderate: {
    text: "text-aqi-moderate",
    soft: "bg-aqi-moderate/15 text-aqi-moderate",
    stroke: "stroke-aqi-moderate",
    fill: "fill-aqi-moderate",
  },
  poor: {
    text: "text-aqi-poor",
    soft: "bg-aqi-poor/15 text-aqi-poor",
    stroke: "stroke-aqi-poor",
    fill: "fill-aqi-poor",
  },
  "very-poor": {
    text: "text-aqi-very-poor",
    soft: "bg-aqi-very-poor/15 text-aqi-very-poor",
    stroke: "stroke-aqi-very-poor",
    fill: "fill-aqi-very-poor",
  },
};

export function aqiStyle(token: string | null | undefined): AqiStyle {
  return (token && STYLES[token]) || NEUTRAL;
}

const TOKEN_BY_INDEX = ["good", "fair", "moderate", "poor", "very-poor"] as const;

/**
 * Colour token for an AQI index. History rows carry only the number, so the colour comes from
 * the same 1 to 5 order the API uses. Labels still come from the API.
 */
export function tokenForAqi(index: number | null | undefined): string | null {
  if (index === null || index === undefined || index < 1 || index > 5) {
    return null;
  }
  return TOKEN_BY_INDEX[index - 1];
}
