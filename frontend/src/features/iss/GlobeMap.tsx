import { useEffect, useRef, useState } from "react";
import Globe from "three-globe";
import {
  AmbientLight,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
} from "three";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countriesTopology from "world-atlas/countries-110m.json";

import { EarthCanvasFallback } from "@/features/iss/EarthCanvasFallback";
import { GlobeZoomControls } from "@/features/iss/GlobeZoomControls";
import type { IssPosition, Place } from "@/types";

interface GlobeMapProps {
  position: IssPosition | undefined;
  place: Place;
}

interface IconMarkerDatum {
  lat: number;
  lon: number;
  altitude: number;
  kind: "place" | "ground" | "iss";
  label: string;
}

const COUNTRY_TOPOLOGY = countriesTopology as unknown as Topology;
const COUNTRY_BOUNDARIES = feature(
  COUNTRY_TOPOLOGY,
  COUNTRY_TOPOLOGY.objects.countries as GeometryCollection,
).features;

const EARTH_TEXTURE_8K = "/earth-clouds-8k.jpg";
const EARTH_TEXTURE_4K = "/earth-clouds-4k.jpg";
const ISS_COLOR = "#38d8ff";
const PLACE_COLOR = "#ff3b47";
const GROUND_COLOR = "#eaf6ff";
const STARTING_DISTANCE = 330;
const MIN_ZOOM_DISTANCE = 108;
const MAX_ZOOM_DISTANCE = 800;

function supportsWebGl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** A real 3D Blue Marble Earth: 4K NASA surface/cloud texture, drag rotation, and zoom. */
export function GlobeMap({ position, place }: GlobeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<Globe | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const firstViewSetRef = useRef(false);
  const [webgl] = useState(supportsWebGl);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !webgl) return;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.outputColorSpace = SRGBColorSpace;
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    const textureUrl =
      renderer.capabilities.maxTextureSize >= 8192 && deviceMemory >= 4
        ? EARTH_TEXTURE_8K
        : EARTH_TEXTURE_4K;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const overlayRenderer = new CSS2DRenderer();
    overlayRenderer.setSize(container.clientWidth, container.clientHeight);
    Object.assign(overlayRenderer.domElement.style, {
      position: "absolute",
      inset: "0",
      pointerEvents: "none",
      zIndex: "1",
    });
    container.appendChild(overlayRenderer.domElement);

    const scene = new Scene();
    const camera = new PerspectiveCamera(
      38,
      container.clientWidth / container.clientHeight,
      1,
      5000,
    );
    // three-globe's Earth has a radius of 100. Keep the entire sphere in view initially.
    camera.position.set(0, 0, STARTING_DISTANCE);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = MIN_ZOOM_DISTANCE;
    controls.maxDistance = MAX_ZOOM_DISTANCE;
    controls.zoomSpeed = 0.8;
    controls.rotateSpeed = 0.55;
    controls.minPolarAngle = Math.PI * 0.04;
    controls.maxPolarAngle = Math.PI * 0.96;
    controlsRef.current = controls;

    const globe = new Globe()
      .globeImageUrl(textureUrl)
      .showAtmosphere(true)
      .atmosphereColor("#83d9ff")
      .atmosphereAltitude(0.075)
      .htmlElementsData([])
      .htmlLat("lat")
      .htmlLng("lon")
      .htmlAltitude("altitude")
      .htmlElement(createGlobeMarker)
      .htmlTransitionDuration(0)
      .polygonsData(COUNTRY_BOUNDARIES)
      .polygonCapColor(() => "rgba(0,0,0,0)")
      .polygonSideColor(() => "rgba(0,0,0,0)")
      .polygonStrokeColor(() => "rgba(190,220,240,0.42)")
      .polygonAltitude(0.0015)
      .polygonsTransitionDuration(0)
      .pathsData([])
      .pathPoints("points")
      .pathPointLat("lat")
      .pathPointLng("lon")
      .pathPointAlt("altitude")
      .pathColor((path: object) => isUserDistancePath(path) ? "#05070a" : "#8be9ff")
      .pathStroke((path: object) => isUserDistancePath(path) ? 1.5 : 1.15)
      .pathDashLength((path: object) => isUserDistancePath(path) ? 0.018 : 0.12)
      .pathDashGap((path: object) => isUserDistancePath(path) ? 0.018 : 0.12)
      .pathTransitionDuration(0);
    scene.add(globe);
    globeRef.current = globe;

    scene.add(new AmbientLight(0xffffff, 1.1));
    const sunlight = new DirectionalLight(0xffffff, 1.35);
    sunlight.position.set(-280, 190, 420);
    scene.add(sunlight);

    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      controls.update();
      globe.setPointOfView(camera);
      renderer.render(scene, camera);
      overlayRenderer.render(scene, camera);
    };
    loop();

    const onResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height);
      overlayRenderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(container);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      container.removeChild(overlayRenderer.domElement);
      container.removeChild(renderer.domElement);
      globeRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
    };
  }, [webgl]);

  // Frame the user's place and the ISS together the first time position data arrives.
  // After that, keep the user's chosen rotation instead of snapping on each live update.
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const globe = globeRef.current;
    if (!camera || !controls || !globe || firstViewSetRef.current) return;

    const target = position
      ? midpoint(place, position)
      : { lat: place.lat, lon: place.lon };
    const view = globe.getCoords(target.lat, target.lon);
    camera.position.set(view.x, view.y, view.z).setLength(STARTING_DISTANCE);
    controls.update();
    if (position) firstViewSetRef.current = true;
  }, [place, position, webgl]);

  useEffect(() => {
    const markers: IconMarkerDatum[] = [
      {
        lat: place.lat,
        lon: place.lon,
        kind: "place",
        label: place.name,
        altitude: 0.012,
      },
    ];
    const globe = globeRef.current;
    if (position) {
      markers.push(
        {
          lat: position.lat,
          lon: position.lon,
          kind: "ground",
          label: "ISS ground point",
          altitude: 0.002,
        },
        {
          lat: position.lat,
          lon: position.lon,
          kind: "iss",
          label: "ISS",
          altitude: 0.068,
        },
      );
      globe?.pathsData([
        {
          kind: "ground-tether",
          points: [
            { lat: position.lat, lon: position.lon, altitude: 0.002 },
            { lat: position.lat, lon: position.lon, altitude: 0.068 },
          ],
        },
        {
          kind: "user-distance",
          points: createSurfaceConnection(position, { lat: place.lat, lon: place.lon }),
        },
      ]);
    } else {
      globe?.pathsData([]);
    }
    globe?.htmlElementsData(markers);
  }, [position, place.lat, place.lon, place.name]);

  const zoomCamera = (factor: number) => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.position.setLength(
      Math.max(MIN_ZOOM_DISTANCE, Math.min(MAX_ZOOM_DISTANCE, camera.position.length() * factor)),
    );
    controlsRef.current?.update();
  };

  if (!webgl) {
    return <EarthCanvasFallback position={position} place={place} />;
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_center,#10253e_0%,#050b16_72%)]">
      <div
        ref={containerRef}
        className="absolute inset-0"
        role="img"
        aria-label={
          position
            ? `A photorealistic 3D Earth showing the ISS ${position.region.toLowerCase()} and ${place.name}`
            : `A photorealistic 3D Earth centered near ${place.name}`
        }
      />
      <div className="pointer-events-none absolute left-3 bottom-3 z-10 flex flex-wrap gap-2" aria-hidden="true">
        <Legend color={ISS_COLOR} label="ISS" />
        <Legend color={PLACE_COLOR} label={place.name} />
      </div>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/10 bg-slate-950/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white/75">
        Drag to rotate · scroll to zoom
      </span>
      <GlobeZoomControls onZoomIn={() => zoomCamera(0.8)} onZoomOut={() => zoomCamera(1.25)} />
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/80 px-2.5 py-1 text-xs font-medium text-white shadow-lg backdrop-blur">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} /> {label}
    </span>
  );
}

function isUserDistancePath(path: object) {
  return (path as { kind?: string }).kind === "user-distance";
}

function createSurfaceConnection(position: IssPosition, place: Pick<Place, "lat" | "lon">) {
  const toVector = (lat: number, lon: number) => {
    const latitude = (lat * Math.PI) / 180;
    const longitude = (lon * Math.PI) / 180;
    return [Math.cos(latitude) * Math.cos(longitude), Math.sin(latitude), Math.cos(latitude) * Math.sin(longitude)];
  };
  const start = toVector(position.lat, position.lon);
  const end = toVector(place.lat, place.lon);
  const dot = Math.max(-1, Math.min(1, start[0] * end[0] + start[1] * end[1] + start[2] * end[2]));
  const angle = Math.acos(dot);
  const steps = Math.max(24, Math.ceil(angle * 48));
  const sinAngle = Math.sin(angle);

  return Array.from({ length: steps + 1 }, (_, index) => {
    const fraction = index / steps;
    let vector: number[];
    if (angle < 1e-6 || Math.abs(sinAngle) < 1e-6) {
      vector = start.map((component, axis) => component * (1 - fraction) + end[axis] * fraction);
    } else {
      const startWeight = Math.sin((1 - fraction) * angle) / sinAngle;
      const endWeight = Math.sin(fraction * angle) / sinAngle;
      vector = start.map((component, axis) => component * startWeight + end[axis] * endWeight);
    }
    const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
    return {
      lat: (Math.asin(vector[1] / length) * 180) / Math.PI,
      lon: (Math.atan2(vector[2], vector[0]) * 180) / Math.PI,
      altitude: index === 0 ? 0.068 : index === steps ? 0.012 : 0.01,
    };
  });
}

function midpoint(place: Place, position: IssPosition) {
  const longitudeDifference = ((position.lon - place.lon + 540) % 360) - 180;
  return {
    lat: (place.lat + position.lat) / 2,
    lon: ((place.lon + longitudeDifference / 2 + 540) % 360) - 180,
  };
}

function createGlobeMarker(marker: object): HTMLElement {
  const item = marker as IconMarkerDatum;
  const root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  root.title = item.label;
  root.style.width = "0";
  root.style.height = "0";
  root.style.overflow = "visible";

  const icon = document.createElement("span");
  icon.style.display = "block";
  icon.style.position = "absolute";
  icon.style.pointerEvents = "none";
  icon.style.left = item.kind === "place" ? "-10px" : item.kind === "ground" ? "-4px" : "-18px";
  icon.style.top = item.kind === "place" ? "-28px" : item.kind === "ground" ? "-4px" : "-12px";
  const markerColor = item.kind === "place" ? PLACE_COLOR : item.kind === "ground" ? GROUND_COLOR : ISS_COLOR;
  icon.style.filter = `drop-shadow(0 2px 6px ${markerColor}aa)`;

  if (item.kind === "place") {
    icon.style.width = "20px";
    icon.style.height = "28px";
    icon.innerHTML = `<svg viewBox="0 0 24 32" width="20" height="28" aria-hidden="true"><path d="M12 30S2.5 19.4 2.5 11.5a9.5 9.5 0 1 1 19 0C21.5 19.4 12 30 12 30Z" fill="${PLACE_COLOR}" stroke="white" stroke-width="1.5"/><circle cx="12" cy="11.5" r="3.25" fill="#142033" stroke="white" stroke-width="1"/></svg>`;
  } else if (item.kind === "ground") {
    icon.style.width = "8px";
    icon.style.height = "8px";
    icon.innerHTML = `<svg viewBox="0 0 8 8" width="8" height="8" aria-hidden="true"><circle cx="4" cy="4" r="3" fill="${GROUND_COLOR}" stroke="#07253b" stroke-width="1.5"/></svg>`;
  } else {
    icon.style.width = "36px";
    icon.style.height = "24px";
    icon.innerHTML = `<img src="/iss-marker.svg" width="36" height="24" alt="" draggable="false" style="display:block;filter:drop-shadow(0 0 2px #ffffff88)"/>`;
  }

  root.appendChild(icon);
  return root;
}
