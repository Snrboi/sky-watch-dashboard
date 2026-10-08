import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { useMediaQuery } from "@/hooks/use-media-query";
import { useBackground } from "@/features/apod/use-apod";
import { MOTION, motionDuration } from "@/lib/motion";

/**
 * The NASA picture of the day, full screen, behind every page (PRD F-02).
 *
 * The CSS gradient shows first. The image loads in the background, then fades in from a blur,
 * with a slow zoom that loops. Reduced motion keeps the fade and drops the zoom. A scrim keeps
 * the text readable.
 */
export function ApodBackground() {
  const query = useBackground();
  const reduce = useReducedMotion();
  const wide = useMediaQuery("(min-width: 1600px)");
  const background = query.data;
  const source = background ? (wide && background.hd_url ? background.hd_url : background.image_url) : null;
  const [loaded, setLoaded] = useState<string | null>(null);

  useEffect(() => {
    if (!source) {
      return;
    }
    let active = true;
    const image = new Image();
    image.onload = () => {
      if (active) {
        setLoaded(source);
      }
    };
    image.onerror = () => {
      if (active) {
        setLoaded(null);
      }
    };
    image.src = source;
    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [source]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(60rem_40rem_at_15%_-10%,oklch(0.34_0.07_250/0.6),transparent),radial-gradient(50rem_36rem_at_100%_110%,oklch(0.27_0.06_290/0.5),transparent)]" />
      {loaded ? (
        <motion.div
          key={loaded}
          className="absolute inset-0"
          initial={{ opacity: 0, filter: "blur(14px)" }}
          animate={{ opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: motionDuration(MOTION.backgroundSeconds, reduce) }}
        >
          <motion.img
            src={loaded}
            alt=""
            className="size-full object-cover"
            animate={reduce ? undefined : { scale: [1, 1.04] }}
            transition={
              reduce
                ? undefined
                : { duration: MOTION.zoomSeconds, ease: "linear", repeat: Infinity, repeatType: "reverse" }
            }
          />
        </motion.div>
      ) : null}
      <div className="absolute inset-0 bg-linear-to-b from-background/60 via-background/40 to-background/90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,oklch(0.1_0.01_260/0.65))]" />
    </div>
  );
}
