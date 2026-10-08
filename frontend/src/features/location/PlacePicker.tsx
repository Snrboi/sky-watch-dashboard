import { Loader2, MapPin } from "lucide-react";
import { useState } from "react";

import { ErrorState } from "@/components/common/QueryBody";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocation } from "@/features/location/location-context";
import { useGeocode } from "@/features/location/use-geocode";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
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
  const trimmed = query.trim();
  const debounced = useDebouncedValue(trimmed, 250);
  const search = useGeocode(debounced);
  const results = search.data?.results ?? [];

  function choose(place: Place) {
    setPlace(place);
    onDone();
  }

  return (
    <Command shouldFilter={false} className="bg-transparent">
      <CommandInput placeholder="Search for a city" value={query} onValueChange={setQuery} />
      <CommandList className="max-h-80">
        {trimmed.length < 2 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Type at least two letters.</p>
        ) : null}
        {trimmed.length >= 2 && search.isFetching && results.length === 0 ? (
          <p className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4" aria-hidden="true" />
            Searching…
          </p>
        ) : null}
        {search.isError ? (
          <div className="p-3">
            <ErrorState error={search.error} onRetry={() => void search.refetch()} title="Search is unavailable" />
          </div>
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
      </CommandList>
    </Command>
  );
}
