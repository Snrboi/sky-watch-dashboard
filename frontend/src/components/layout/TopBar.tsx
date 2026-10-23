import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useWeather } from "@/features/weather/use-weather";
import { useLocation } from "@/features/location/location-context";
import { useNow } from "@/hooks/use-now";
import { formatRelative } from "@/lib/format";

/** The current city picker and the latest update time. */
export function TopBar() {
  const { place, setPickerOpen } = useLocation();
  const weather = useWeather(place);
  const now = useNow();
  const updatedAt = weather.data?.fetched_at;

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-background/40 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 min-w-0 max-w-[60vw] gap-2 rounded-full border border-white/10 bg-white/5 px-3"
          onClick={() => setPickerOpen(true)}
          aria-label={`Change city. Current city: ${place.name}`}
        >
          <MapPin className="size-3.5 shrink-0 text-sky" aria-hidden="true" />
          <span className="truncate">{place.name}</span>
        </Button>
        {updatedAt ? (
          <p className="ml-auto truncate text-right text-xs text-muted-foreground">
            Updated {formatRelative(updatedAt, now)}
          </p>
        ) : null}
      </div>
    </header>
  );
}
