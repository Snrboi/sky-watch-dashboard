import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useMemo, useEffect } from "react";

import {
  GRATICULE_PATH,
  LAND_PATH,
  MAP_HEIGHT,
  MAP_WIDTH,
  polygonPath,
  project,
  shouldJump,
  SPHERE_PATH,
  terminatorPolygon,
  type MapPoint,
} from "@/lib/geo";
import { MOTION } from "@/lib/motion";
import type { IssPosition, Place } from "@/types";

interface IssMapProps {
  position: IssPosition | undefined;
  place: Place;
}

/**
 * A stylized dark map fallback: Natural Earth land drawn with d3-geo. No tiles,
 * no keys. The night half is shaded from the sun's coordinates; the ISS marker
 * glides to each update with a pulsing halo. Reduced motion removes both effects.
 */
export function IssMap({ position, place }: IssMapProps) {
  const issPoint = position ? project(position.lat, position.lon) : null;
  const cityPoint = project(place.lat, place.lon);

  const nightPath = useMemo(() => {
    if (!position?.solar_lat || !position?.solar_lon) {
      return null;
    }
    const polygon = terminatorPolygon(position.solar_lat, position.solar_lon);
    return polygon ? polygonPath(polygon) : null;
  }, [position]);


  return (
    <svg
      viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
      role="img"
      aria-label={
        position
          ? `Map showing the ISS ${position.region.toLowerCase()} and ${place.name}`
          : `Map of the world with ${place.name} marked`
      }
      className="block h-auto w-full"
    >
      <path d={SPHERE_PATH} className="fill-white/[0.02] stroke-white/10" strokeWidth={1} />
      <path d={GRATICULE_PATH} className="fill-none stroke-white/[0.07]" strokeWidth={0.6} />
      <path d={LAND_PATH} className="fill-white/[0.1] stroke-white/20" strokeWidth={0.6} />
      {nightPath ? <path d={nightPath} className="fill-black/40" aria-hidden="true" /> : null}
      {cityPoint ? (
        <g>
          <circle
            cx={cityPoint.x}
            cy={cityPoint.y}
            r={9}
            className="fill-none stroke-[#ff3b47]/80"
            strokeWidth={1}
          />
          <circle cx={cityPoint.x} cy={cityPoint.y} r={3.5} className="fill-[#ff3b47]" />
        </g>
      ) : null}
      {issPoint ? <IssMarker point={issPoint} /> : null}
    </svg>
  );
}

/**
 * The ISS marker. It mounts only once a position exists, so it starts exactly there and never
 * animates in from the map corner. Each later update glides over the poll interval. A crossing
 * of the antimeridian jumps instead, so the marker never sweeps across the whole map.
 */
function IssMarker({ point }: { point: MapPoint }) {
  const reduce = useReducedMotion();
  const x = useMotionValue(point.x);
  const y = useMotionValue(point.y);

  useEffect(() => {
    if (reduce || shouldJump(x.get(), point.x)) {
      x.set(point.x);
      y.set(point.y);
      return;
    }
    const glideX = animate(x, point.x, { duration: MOTION.issGlideSeconds, ease: "linear" });
    const glideY = animate(y, point.y, { duration: MOTION.issGlideSeconds, ease: "linear" });
    return () => {
      glideX.stop();
      glideY.stop();
    };
  }, [point.x, point.y, reduce, x, y]);

  return (
    <g>
      {reduce ? null : (
        <motion.circle
          cx={x}
          cy={y}
          className="fill-sky"
          initial={{ r: 6, opacity: 0.5 }}
          animate={{ r: [6, 22], opacity: [0.45, 0] }}
          transition={{ duration: MOTION.haloSeconds, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <motion.circle cx={x} cy={y} r={5} className="fill-sky stroke-background" strokeWidth={2} />
    </g>
  );
}
