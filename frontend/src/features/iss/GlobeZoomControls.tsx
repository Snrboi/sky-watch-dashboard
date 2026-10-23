import { ZoomIn, ZoomOut } from "lucide-react";

export function GlobeZoomControls({
  onZoomIn,
  onZoomOut,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  return (
    <div className="absolute bottom-3 right-3 z-10 flex overflow-hidden rounded-lg border border-white/15 bg-slate-950/80 shadow-lg backdrop-blur">
      <button
        type="button"
        aria-label="Zoom in on Earth"
        onClick={onZoomIn}
        className="grid size-9 place-items-center text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky"
      >
        <ZoomIn className="size-4" aria-hidden="true" />
      </button>
      <span className="w-px bg-white/15" aria-hidden="true" />
      <button
        type="button"
        aria-label="Zoom out on Earth"
        onClick={onZoomOut}
        className="grid size-9 place-items-center text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky"
      >
        <ZoomOut className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
