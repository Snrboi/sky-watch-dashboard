/**
 * Map geometry for the stylized ISS map. Natural Earth land (public domain, via world-atlas),
 * projected with d3-geo. No tiles, no keys.
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
