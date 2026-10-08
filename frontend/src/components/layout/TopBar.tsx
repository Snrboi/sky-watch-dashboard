import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useWeather } from "@/features/weather/use-weather";
import { useLocation } from "@/features/location/location-context";
import { useNow } from "@/hooks/use-now";
import { formatRelative } from "@/lib/format";

const SHORTCUT_MODIFIER =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";

/** Current city (opens the picker), the last-updated time, and the search shortcut. */
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
          className="h-8 max-w-[60vw] gap-2 rounded-full border border-white/10 bg-white/5 px-3"
          onClick={() => setPickerOpen(true)}
          aria-label={`Change city. Current city: ${place.name}`}
        >
          <MapPin className="size-3.5 shrink-0 text-sky" aria-hidden="true" />
          <span className="truncate">{place.name}</span>
        </Button>
        <div className="ml-auto flex items-center gap-4">
          {updatedAt ? (
            <p className="hidden text-xs text-muted-foreground sm:block">
              Updated {formatRelative(updatedAt, now)}
            </p>
          ) : null}
          <p className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
            Search
            <KbdGroup>
              <Kbd>{SHORTCUT_MODIFIER}</Kbd>
              <Kbd>K</Kbd>
            </KbdGroup>
          </p>
        </div>
      </div>
    </header>
  );
}
