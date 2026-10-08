import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  Mountain,
  Snowflake,
  Sun,
  Thermometer,
  Tornado,
  Wind,
  type LucideIcon,
} from "lucide-react";

/** Icon tokens from the API (weather.icon) mapped to lucide icons. */
const WEATHER_ICONS: Record<string, LucideIcon> = {
  clear: Sun,
  clouds: Cloud,
  rain: CloudRain,
  drizzle: CloudDrizzle,
  thunderstorm: CloudLightning,
  snow: Snowflake,
  fog: CloudFog,
  dust: Wind,
  ash: Mountain,
  wind: Wind,
  tornado: Tornado,
};

export function weatherIcon(token: string | null | undefined): LucideIcon {
  return (token && WEATHER_ICONS[token]) || Thermometer;
}
