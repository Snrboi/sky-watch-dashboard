/**
 * Motion budget (PRD 7.3). Motion marks state changes only. At most two loops run on screen:
 * the background zoom and the ISS halo. Every duration goes through motionDuration(), which
 * returns 0 when the user prefers reduced motion.
 */

export const MOTION = {
  pageSeconds: 0.22,
  revealSeconds: 0.4,
  skeletonSeconds: 0.2,
  staggerSeconds: 0.05,
  countSeconds: 0.6,
  gaugeSeconds: 0.8,
  backgroundSeconds: 0.9,
  citySwapSeconds: 0.3,
  expandSeconds: 0.25,
  issGlideSeconds: 5,
  haloSeconds: 2.4,
  zoomSeconds: 40,
} as const;

export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function motionDuration(seconds: number, reduce: boolean | null | undefined): number {
  return reduce ? 0 : seconds;
}
