import { Crosshair, History, Loader2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

import { ErrorState } from "@/components/common/QueryBody";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocation } from "@/features/location/location-context";
import { useGeocode } from "@/features/location/use-geocode";
import { useReverseGeocode } from "@/features/location/use-reverse-geocode";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { loadRecentPlaces, saveRecentPlace } from "@/lib/storage";
import type { Place } from "@/types";

/** Pick a city. Search runs after two letters, and a choice applies everywhere at once. */
export function PlacePicker() {
  const { pickerOpen, setPickerOpen } = useLocation();
  return (
    <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
      <DialogContent className="glass max-w-lg gap-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Choose a city</DialogTitle>
          <DialogDescription>Search by city name. Your choice is saved in this browser.</DialogDescription>
        </DialogHeader>
        <PlacePickerBody onDone={() => setPickerOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

/** Mounted only while the dialog is open, so the query resets on every open. */
function PlacePickerBody({ onDone }: { onDone: () => void }) {
  const { setPlace } = useLocation();
  const [query, setQuery] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed, 250);
  const search = useGeocode(debounced);
  const reverse = useReverseGeocode(coordinates);
  const results = search.data?.results ?? [];
  const recent = loadRecentPlaces();

  // A reverse lookup resolves the browser's coordinates to a place.
  useEffect(() => {
    const first = reverse.data?.results[0];
    if (first) {
      choose(first);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reverse.data]);

  function choose(place: Place) {
    saveRecentPlace(place);
    setPlace(place);
    onDone();
  }

  function useMyLocation() {
    setLocationError(null);
    if (!("geolocation" in navigator)) {
      setLocationError("This browser cannot find your location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) =>
        setCoordinates({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        }),
      () => setLocationError("Location was refused or is unavailable."),
      { timeout: 10_000 },
    );
  }

  return (
    <Command shouldFilter={false}>
      <div className="flex items-center gap-2 border-b border-white/10 px-3">
        <CommandInput placeholder="Search for a city" value={query} onValueChange={setQuery} />
        <button
          type="button"
          onClick={useMyLocation}
          aria-label="Use my location"
          className="shrink-0 rounded-md p-2 text-muted-foreground outline-none hover:bg-white/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {reverse.isFetching || coordinates ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Crosshair className="size-4" aria-hidden="true" />}
        </button>
      </div>
      {locationError ? (
        <p className="px-3 py-2 text-xs text-muted-foreground" role="alert">{locationError}</p>
      ) : null}
      <CommandList>
        {recent.length > 0 ? (
          <CommandGroup heading="Recent">
            {recent.map((place) => (
              <CommandItem
                key={`recent-${place.lat},${place.lon}`}
                value={`recent-${place.name} ${place.state ?? ""} ${place.country}`}
                onSelect={() => choose(place)}
              >
                <History className="text-muted-foreground" aria-hidden="true" />
                <span className="font-medium">{place.name}</span>
                <span className="truncate text-muted-foreground">
                  {[place.state, place.country].filter(Boolean).join(", ")}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {trimmed.length >= 2 && !search.isFetching && !search.isError && search.data && results.length === 0 ? (
          <CommandEmpty>No places match “{trimmed}”.</CommandEmpty>
        ) : null}
        {results.length > 0 ? (
          <CommandGroup heading="Places">
            {results.map((place) => (
              <CommandItem
                key={`${place.lat},${place.lon}`}
                value={`${place.name} ${place.state ?? ""} ${place.country}`}
                onSelect={() => choose(place)}
              >
                <MapPin className="text-muted-foreground" aria-hidden="true" />
                <span className="font-medium">{place.name}</span>
                <span className="truncate text-muted-foreground">
                  {[place.state, place.country].filter(Boolean).join(", ")}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {search.isError ? <ErrorState error={search.error} onRetry={() => search.refetch()} /> : null}
      </CommandList>
    </Command>
  );
}
