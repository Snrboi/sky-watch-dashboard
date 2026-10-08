import { useCallback, useMemo, useState, type ReactNode } from "react";

import { LocationContext, placeKeyOf } from "@/features/location/location-context";
import { loadPlace, savePlace } from "@/lib/storage";
import type { Place } from "@/types";

interface LocationProviderProps {
  children: ReactNode;
  initialPlace?: Place;
}

export function LocationProvider({ children, initialPlace }: LocationProviderProps) {
  const [place, setPlaceState] = useState<Place>(() => initialPlace ?? loadPlace());
  const [pickerOpen, setPickerOpen] = useState(false);

  const setPlace = useCallback((next: Place) => {
    setPlaceState(next);
    savePlace(next);
  }, []);

  const value = useMemo(
    () => ({ place, placeKey: placeKeyOf(place), setPlace, pickerOpen, setPickerOpen }),
    [place, setPlace, pickerOpen],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}
