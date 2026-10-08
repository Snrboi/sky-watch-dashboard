import { useEffect, useRef } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { FadeSwap } from "@/components/motion/FadeSwap";
import { Reveal } from "@/components/motion/Reveal";
import { AqiCard } from "@/features/air-quality/AqiCard";
import { PhotoCard } from "@/features/apod/PhotoCard";
import { useLocation } from "@/features/location/location-context";
import { IssCard } from "@/features/iss/IssCard";
import { NextPassCard } from "@/features/iss/NextPassCard";
import { useRecordLookup } from "@/features/history/use-history";
import { WeatherCard } from "@/features/weather/WeatherCard";
import { formatCoordinates } from "@/lib/format";

/** The glance view: weather, air quality, the ISS, the next pass, and today's photo. */
export default function OverviewPage() {
  const { place, placeKey } = useLocation();
  const { mutate } = useRecordLookup();
  const recordedKey = useRef<string | null>(null);

  // Save each place once per visit. The server applies the 30-minute throttle.
  useEffect(() => {
    if (recordedKey.current === placeKey) {
      return;
    }
    recordedKey.current = placeKey;
    mutate(place);
  }, [placeKey, place, mutate]);

  const region = [place.state, place.country].filter(Boolean).join(", ");

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Right now"
        title={`Sky over ${place.name}`}
        description={`${region} · ${formatCoordinates(place.lat, place.lon)}`}
      />
      <FadeSwap swapKey={placeKey} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Reveal index={0} className="md:col-span-2">
          <WeatherCard place={place} className="h-full" />
        </Reveal>
        <Reveal index={1}>
          <AqiCard place={place} className="h-full" />
        </Reveal>
        <Reveal index={2}>
          <IssCard place={place} className="h-full" />
        </Reveal>
        <Reveal index={3}>
          <NextPassCard place={place} className="h-full" />
        </Reveal>
        <Reveal index={4}>
          <PhotoCard className="h-full" />
        </Reveal>
      </FadeSwap>
    </div>
  );
}
