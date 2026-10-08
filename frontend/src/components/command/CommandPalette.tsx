import { MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocation } from "@/features/location/location-context";
import { useGeocode } from "@/features/location/use-geocode";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { Place } from "@/types";

/** Cmd+K (Ctrl+K) opens navigation and city search (PRD F-10). */
export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="glass max-w-lg gap-0 overflow-hidden p-0 sm:max-w-lg" showCloseButton={false}>
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>Jump to a page, change the city, or search for a place.</DialogDescription>
        </DialogHeader>
        <PaletteBody onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

/** Mounted only while open, so the query resets on every open. */
function PaletteBody({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const { setPlace, setPickerOpen } = useLocation();
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query.trim(), 250);
  const search = useGeocode(debounced);
  const results = search.data?.results ?? [];

  function go(path: string) {
    onDone();
    navigate(path);
  }

  function choose(place: Place) {
    setPlace(place);
    onDone();
  }

  return (
    <Command className="bg-transparent">
      <CommandInput placeholder="Go to a page, or search for a city" value={query} onValueChange={setQuery} />
      <CommandList className="max-h-96">
        <CommandEmpty>Nothing found.</CommandEmpty>
        <CommandGroup heading="Go to">
          {NAV_ITEMS.map((item) => (
            <CommandItem key={item.to} value={`go ${item.label}`} onSelect={() => go(item.to)}>
              <item.icon className="text-muted-foreground" aria-hidden="true" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Location">
          <CommandItem
            value="change city location"
            onSelect={() => {
              onDone();
              setPickerOpen(true);
            }}
          >
            <MapPin className="text-muted-foreground" aria-hidden="true" />
            Change city…
          </CommandItem>
        </CommandGroup>
        {results.length > 0 ? (
          <CommandGroup heading="Places">
            {results.map((place) => (
              <CommandItem
                key={`${place.lat},${place.lon}`}
                value={`place ${place.name} ${place.state ?? ""} ${place.country}`}
                onSelect={() => choose(place)}
              >
                <MapPin className="text-muted-foreground" aria-hidden="true" />
                {place.name}
                <span className="text-muted-foreground">{[place.state, place.country].filter(Boolean).join(", ")}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </Command>
  );
}
