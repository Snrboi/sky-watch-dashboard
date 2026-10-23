/**
 * Map geometry for the stylized ISS map. Natural Earth land (public domain, via world-atlas),
 * projected with d3-geo. No tiles, no keys.
 *
 * Also holds the day/night terminator: the line where the sun sets, computed from the
 * coordinates of the point where the sun is directly overhead. The night half of the
 * map is the terminator curve closed along the dark polar edge.
 */

import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import landTopology from "world-atlas/land-110m.json";

export const MAP_WIDTH = 960;
export const MAP_HEIGHT = 480;

const projection = geoNaturalEarth1().fitSize([MAP_WIDTH, MAP_HEIGHT], { type: "Sphere" });
const pathFor = geoPath(projection);

const topology = landTopology as unknown as Topology;
const land = feature(topology, topology.objects.land as GeometryCollection);

export const SPHERE_PATH = pathFor({ type: "Sphere" }) ?? "";
export const GRATICULE_PATH = pathFor(geoGraticule10()) ?? "";
export const LAND_PATH = pathFor(land) ?? "";

export interface MapPoint {
  x: number;
  y: number;
}

export function project(lat: number, lon: number): MapPoint | null {
  const point = projection([lon, lat]);
  return point ? { x: point[0], y: point[1] } : null;
}

/** True when the marker crossed the antimeridian. Gliding across the whole map would look wrong. */
export function shouldJump(previousX: number, nextX: number): boolean {
  return Math.abs(nextX - previousX) > MAP_WIDTH / 2;
}

/**
 * The night side of the map as one polygon.
 *
 * For a fixed longitude the sun's elevation crosses zero exactly once, so the
 * terminator is a single closed curve, and the night region is everything on the
 * far side of it from the sun: the curve plus the polar edge of the dark
 * hemisphere. Near the equinox the curve runs off the top and bottom of the map,
 * so the night side becomes the rectangle between the two meridians 90 degrees
 * from the sun.
 */
export function terminatorPolygon(
  solarLat: number,
  solarLon: number,
): MapPoint[] | null {
  if (!Number.isFinite(solarLat) || !Number.isFinite(solarLon)) {
    return null;
  }
  if (Math.abs(solarLat) < 0.5) {
    // Equinox: the terminator is the meridian pair at solarLon +/- 90 degrees.
    const rising = project(90, solarLon + 90);
    const risingLow = project(-90, solarLon + 90);
    const setting = project(-90, solarLon + 270);
    const settingHigh = project(90, solarLon + 270);
    if (!rising || !risingLow || !setting || !settingHigh) {
      return null;
    }
    return [rising, risingLow, setting, settingHigh];
  }

  const solarLatRad = (solarLat * Math.PI) / 180;
  const tanSolar = Math.tan(solarLatRad);
  const curve: MapPoint[] = [];
  for (let lon = -180; lon <= 180; lon += 4) {
    const delta = ((lon - solarLon) * Math.PI) / 180;
    // tan(lat) = -cos(lon - solarLon) / tan(solarLat): where the sun sets.
    const latRad = Math.atan(-Math.cos(delta) / tanSolar);
    const latDeg = Math.max(-89.9, Math.min(89.9, (latRad * 180) / Math.PI));
    const point = project(latDeg, lon);
    if (point) {
      curve.push(point);
    }
  }
  if (curve.length < 2) {
    return null;
  }
  // Close along the polar edge of the dark hemisphere.
  const darkPole = solarLat >= 0 ? -90 : 90;
  const endCorner = project(darkPole, 180);
  const startCorner = project(darkPole, -180);
  if (!endCorner || !startCorner) {
    return null;
  }
  return [...curve, endCorner, startCorner];
}

export function polygonPath(points: MapPoint[]): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ") + " Z";
}

export interface TrackSplit {
  past: string;
  future: string;
}

/**
 * A ground track as two SVG paths: the part already flown, and the part to come.
 * Both break at the antimeridian, so the line never sweeps across the whole map.
 */
export function trackPaths(
  points: { lat: number; lon: number; at?: string }[],
  nowMs: number,
  atMs: (point: { at?: string }) => number,
): TrackSplit {
  const past: MapPoint[] = [];
  const future: MapPoint[] = [];
  for (const point of points) {
    const target = atMs(point) <= nowMs ? past : future;
    const projected = project(point.lat, point.lon);
    if (projected) {
      target.push(projected);
    }
  }
  return { past: polylinePath(past), future: polylinePath(future) };
}

function polylinePath(points: MapPoint[]): string {
  let path = "";
  let previousX: number | null = null;
  for (const point of points) {
    const broken = previousX !== null && shouldJump(previousX, point.x);
    path += `${broken ? "M" : path ? "L" : "M"}${point.x},${point.y} `;
    previousX = point.x;
  }
  return path.trim();
}
