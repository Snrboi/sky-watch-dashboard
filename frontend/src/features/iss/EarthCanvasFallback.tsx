import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";

import { GlobeZoomControls } from "@/features/iss/GlobeZoomControls";
import type { IssPosition, Place } from "@/types";

const EARTH_TEXTURE_8K = "/earth-clouds-8k.jpg";
const EARTH_TEXTURE_4K = "/earth-clouds-4k.jpg";
const PLACE_COLOR = "#ff3b47";

interface EarthTexture {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

interface DragStart {
  x: number;
  y: number;
  centerLon: number;
  centerLat: number;
}

/** An orthographic Earth render using the high-resolution NASA texture when WebGL is unavailable. */
export function EarthCanvasFallback({
  position,
  place,
}: {
  position: IssPosition | undefined;
  place: Place;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textureRef = useRef<EarthTexture | null>(null);
  const dragRef = useRef<DragStart | null>(null);
  const [textureReady, setTextureReady] = useState(false);
  const [renderWidth, setRenderWidth] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [{ centerLon, centerLat }, setCenter] = useState(() => initialView(place, position));
  const userMarker = projectMarker(place.lat, place.lon, centerLat, centerLon);
  const issMarker = position
    ? projectMarker(position.lat, position.lon, centerLat, centerLon)
    : null;

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const source = document.createElement("canvas");
      source.width = image.naturalWidth;
      source.height = image.naturalHeight;
      const context = source.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(image, 0, 0);
      const pixels = context.getImageData(0, 0, source.width, source.height).data;
      textureRef.current = { width: source.width, height: source.height, pixels };
      setTextureReady(true);
    };
    image.src = chooseEarthTexture();
    return () => {
      cancelled = true;
      image.onload = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!host) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? host.clientWidth;
      setRenderWidth(width);
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const texture = textureRef.current;
    if (!canvas || !texture || renderWidth <= 0) return;

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
    const diameter = Math.max(2, Math.round(renderWidth * pixelRatio * zoom));
    canvas.width = diameter;
    canvas.height = diameter;
    const context = canvas.getContext("2d");
    if (!context) return;

    const output = context.createImageData(diameter, diameter);
    const pixels = output.data;
    const radius = diameter / 2;
    const latitude0 = (centerLat * Math.PI) / 180;
    const longitude0 = (centerLon * Math.PI) / 180;
    const sinLat0 = Math.sin(latitude0);
    const cosLat0 = Math.cos(latitude0);
    const sinLon0 = Math.sin(longitude0);
    const cosLon0 = Math.cos(longitude0);
    const east = [-sinLon0, 0, cosLon0];
    const north = [-sinLat0 * cosLon0, cosLat0, -sinLat0 * sinLon0];
    const center = [cosLat0 * cosLon0, sinLat0, cosLat0 * sinLon0];
    const lightLength = Math.hypot(-0.34, 0.45, 0.82);
    const light = [-0.34 / lightLength, 0.45 / lightLength, 0.82 / lightLength];
    const textureWidth = texture.width;
    const textureHeight = texture.height;

    for (let y = 0; y < diameter; y += 1) {
      const screenY = (radius - (y + 0.5)) / radius;
      for (let x = 0; x < diameter; x += 1) {
        const screenX = (x + 0.5 - radius) / radius;
        const radial = screenX * screenX + screenY * screenY;
        if (radial > 1) continue;

        const screenZ = Math.sqrt(1 - radial);
        const worldX = screenX * east[0] + screenY * north[0] + screenZ * center[0];
        const worldY = screenX * east[1] + screenY * north[1] + screenZ * center[1];
        const worldZ = screenX * east[2] + screenY * north[2] + screenZ * center[2];
        const latitude = Math.asin(Math.max(-1, Math.min(1, worldY)));
        const longitude = Math.atan2(worldZ, worldX);
        const sourceX = Math.floor((((longitude + Math.PI) / (Math.PI * 2)) * textureWidth) % textureWidth);
        const sourceY = Math.max(
          0,
          Math.min(textureHeight - 1, Math.floor(((Math.PI / 2 - latitude) / Math.PI) * textureHeight)),
        );
        const sourceIndex = (sourceY * textureWidth + sourceX) * 4;
        const outputIndex = (y * diameter + x) * 4;
        const illumination = Math.max(0, screenX * light[0] + screenY * light[1] + screenZ * light[2]);
        const shade = 0.42 + illumination * 0.62;
        pixels[outputIndex] = Math.min(255, texture.pixels[sourceIndex] * shade);
        pixels[outputIndex + 1] = Math.min(255, texture.pixels[sourceIndex + 1] * shade);
        pixels[outputIndex + 2] = Math.min(255, texture.pixels[sourceIndex + 2] * shade);
        pixels[outputIndex + 3] = 255;
      }
    }

    context.putImageData(output, 0, 0);
    context.beginPath();
    context.arc(radius, radius, radius - 1, 0, Math.PI * 2);
    context.strokeStyle = "rgba(125, 211, 252, 0.55)";
    context.lineWidth = Math.max(1, pixelRatio * 1.4);
    context.shadowColor = "rgba(56, 189, 248, 0.55)";
    context.shadowBlur = 14 * pixelRatio;
    context.stroke();
  }, [centerLat, centerLon, renderWidth, textureReady, zoom]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragRef.current = { x: event.clientX, y: event.clientY, centerLon, centerLat };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    if (!start) return;
    const width = event.currentTarget.getBoundingClientRect().width;
    if (width <= 0) return;
    setCenter({
      centerLon: normalizeLongitude(start.centerLon - ((event.clientX - start.x) / width) * 180),
      centerLat: clampLatitude(start.centerLat + ((event.clientY - start.y) / width) * 180),
    });
  };
  const stopDragging = () => {
    dragRef.current = null;
  };
  const changeZoom = (factor: number) => {
    setZoom((current) => Math.min(1.8, Math.max(1, current * factor)));
  };
  const onWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    changeZoom(event.deltaY < 0 ? 1.1 : 0.9);
  };

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-[radial-gradient(ellipse_at_center,#10253e_0%,#050b16_72%)]"
      role="group"
      aria-label={`Interactive Earth globe, showing the ISS and ${place.name}`}
      onWheel={onWheel}
    >
      <div
        className="absolute left-1/2 top-1/2 aspect-square h-[92%] -translate-x-1/2 -translate-y-1/2 touch-none cursor-grab overflow-hidden rounded-full active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        style={{
          scale: zoom,
          boxShadow:
            "0 0 42px rgba(56,189,248,.2), 0 24px 60px rgba(0,0,0,.55), inset 0 0 0 1px rgba(186,230,253,.3)",
        }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 size-full" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(ellipse at 32% 25%, rgba(255,255,255,.13), transparent 36%), radial-gradient(ellipse at 50% 50%, transparent 56%, rgba(2,6,23,.36) 100%)",
          }}
        />
        {userMarker.visible && issMarker?.visible ? (
          <FallbackUserConnection user={userMarker} iss={issMarker} />
        ) : null}
        {userMarker.visible ? (
          <EarthMapMarker left={userMarker.left} top={userMarker.top} kind="place" />
        ) : null}
        {issMarker?.visible ? (
          <>
            <span
              aria-label="Dotted line from the ISS to its ground point"
              data-iss-ground-tether="true"
              className="absolute z-10 h-3.5 border-l-2 border-dotted border-sky-100/90"
              style={{ left: issMarker.left, top: issMarker.top, transform: "translate(-50%, -50%)" }}
            />
            <span
              aria-hidden="true"
              className="absolute z-10 size-2 rounded-full border border-slate-950 bg-sky-50 shadow-[0_0_8px_#8be9ff]"
              style={{ left: issMarker.left, top: issMarker.top, transform: "translate(-50%, -50%)" }}
            />
            <EarthMapMarker left={issMarker.left} top={issMarker.top} kind="iss" lifted />
          </>
        ) : null}
      </div>
      {!textureReady ? (
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xs text-white/70">
          Loading high-resolution Earth texture…
        </span>
      ) : null}
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-wrap gap-2" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/80 px-2.5 py-1 text-xs font-medium text-white shadow-lg backdrop-blur">
          <span className="size-2 rounded-full bg-[#38d8ff]" /> ISS
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/80 px-2.5 py-1 text-xs font-medium text-white shadow-lg backdrop-blur">
          <span className="size-2 rounded-full bg-[#ff3b47]" /> {place.name}
        </span>
      </div>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/10 bg-slate-950/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-widest text-white/75">
        Drag to rotate · scroll to zoom
      </span>
      <GlobeZoomControls onZoomIn={() => changeZoom(1.15)} onZoomOut={() => changeZoom(0.87)} />
    </div>
  );
}

function FallbackUserConnection({
  user,
  iss,
}: {
  user: ReturnType<typeof projectMarker>;
  iss: ReturnType<typeof projectMarker>;
}) {
  const x1 = Number.parseFloat(user.left);
  const y1 = Number.parseFloat(user.top);
  const x2 = Number.parseFloat(iss.left);
  const y2 = Number.parseFloat(iss.top);
  const dx = x2 - x1;
  const dy = y2 - y1;
  return (
    <span
      data-iss-user-connection="true"
      aria-label="Black dotted line from the ISS to your location"
      className="pointer-events-none absolute z-[5] border-t-2 border-dotted border-black"
      style={{
        left: `${x1}%`,
        top: `${y1}%`,
        width: `${Math.hypot(dx, dy)}%`,
        transform: `translateY(-50%) rotate(${Math.atan2(dy, dx)}rad)`,
        transformOrigin: "0 50%",
        filter: "drop-shadow(0 0 1px rgba(255,255,255,.9))",
      }}
    />
  );
}

function EarthMapMarker({
  left,
  top,
  kind,
  lifted = false,
}: {
  left: string;
  top: string;
  kind: "place" | "iss";
  lifted?: boolean;
}) {
  const isPlace = kind === "place";
  return (
    <span
      data-map-marker={kind}
      className={`absolute z-10 ${isPlace ? "-translate-x-1/2 -translate-y-full" : "-translate-x-1/2 -translate-y-1/2"}`}
      style={{
        left,
        top,
        filter: `drop-shadow(0 2px 7px ${isPlace ? "#ff3b47aa" : "#38d8ffaa"})`,
        ...(lifted ? { transform: "translate(-50%, -50%) translateY(-12px)" } : {}),
      }}
      aria-hidden="true"
    >
      {isPlace ? <LocationPinIcon /> : <img src="/iss-marker.svg" className="h-6 w-9" alt="" />}
    </span>
  );
}

function LocationPinIcon() {
  return (
    <svg viewBox="0 0 24 32" className="h-7 w-5" aria-hidden="true">
      <path
        d="M12 30S2.5 19.4 2.5 11.5a9.5 9.5 0 1 1 19 0C21.5 19.4 12 30 12 30Z"
        fill={PLACE_COLOR}
        stroke="white"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="11.5" r="3.25" fill="#142033" stroke="white" strokeWidth="1" />
    </svg>
  );
}

function chooseEarthTexture() {
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return deviceMemory >= 4 && window.innerWidth >= 768 ? EARTH_TEXTURE_8K : EARTH_TEXTURE_4K;
}

function initialView(place: Place, position: IssPosition | undefined) {
  if (!position) {
    return { centerLon: normalizeLongitude(place.lon), centerLat: place.lat };
  }
  const shortestDelta = normalizeSignedLongitude(position.lon - place.lon);
  return {
    centerLon: normalizeLongitude(place.lon + shortestDelta / 2),
    centerLat: (place.lat + position.lat) / 2,
  };
}

function normalizeLongitude(longitude: number) {
  return ((longitude % 360) + 360) % 360;
}

function normalizeSignedLongitude(longitude: number) {
  return ((longitude + 540) % 360) - 180;
}

function clampLatitude(latitude: number) {
  return Math.max(-85, Math.min(85, latitude));
}

function projectMarker(lat: number, lon: number, centerLat: number, centerLon: number) {
  const latitude = (lat * Math.PI) / 180;
  const longitude = (lon * Math.PI) / 180;
  const latitude0 = (centerLat * Math.PI) / 180;
  const longitude0 = (centerLon * Math.PI) / 180;
  const world = [Math.cos(latitude) * Math.cos(longitude), Math.sin(latitude), Math.cos(latitude) * Math.sin(longitude)];
  const east = [-Math.sin(longitude0), 0, Math.cos(longitude0)];
  const north = [
    -Math.sin(latitude0) * Math.cos(longitude0),
    Math.cos(latitude0),
    -Math.sin(latitude0) * Math.sin(longitude0),
  ];
  const center = [
    Math.cos(latitude0) * Math.cos(longitude0),
    Math.sin(latitude0),
    Math.cos(latitude0) * Math.sin(longitude0),
  ];
  const horizontal = world[0] * east[0] + world[1] * east[1] + world[2] * east[2];
  const vertical = world[0] * north[0] + world[1] * north[1] + world[2] * north[2];
  const depth = world[0] * center[0] + world[1] * center[1] + world[2] * center[2];
  return {
    left: `${50 + horizontal * 50}%`,
    top: `${50 - vertical * 50}%`,
    visible: depth > 0.02,
  };
}
