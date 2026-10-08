import { createContext, useContext } from "react";

import type { Place } from "@/types";

export interface LocationValue {
  place: Place;
  /** Stable key for the place, used to swap cards when the city changes. */
  placeKey: string;
  setPlace: (place: Place) => void;
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
}

export const LocationContext = createContext<LocationValue | null>(null);

export function placeKeyOf(place: Place): string {
  return `${place.lat.toFixed(4)},${place.lon.toFixed(4)}`;
}

export function useLocation(): LocationValue {
  const value = useContext(LocationContext);
  if (!value) {
    throw new Error("useLocation must be used inside LocationProvider");
  }
  return value;
}
