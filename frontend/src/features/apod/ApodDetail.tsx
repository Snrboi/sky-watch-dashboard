import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, ImageOff, Video } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/Reveal";
import { formatDay } from "@/lib/format";
import { EASE_OUT, MOTION, motionDuration } from "@/lib/motion";
import type { ApodEntry } from "@/types";

/** The full photo entry: image, title, date, explanation (expandable), credit, and NASA's link. */
export function ApodDetail({ entry }: { entry: ApodEntry }) {
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = useState(false);
  const isVideo = entry.media_type === "video";
  const showImage = !isVideo && !entry.is_placeholder && Boolean(entry.url);

  return (
    <div className="flex flex-col gap-6">
      <div className="relative aspect-video w-full overflow-hidden bg-black/40">
        {showImage ? (
          <ApodImage key={entry.url ?? ""} src={entry.url ?? ""} alt={entry.title} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            {isVideo ? <Video className="size-8 text-muted-foreground" aria-hidden="true" /> : <ImageOff className="size-8 text-muted-foreground" aria-hidden="true" />}
            <p className="max-w-md text-sm text-pretty text-muted-foreground">
              {isVideo
                ? "Today's entry is a video, so it is not used as the background. Watch it on NASA's page."
                : "The image is unavailable for this date. NASA returned a placeholder, not a picture."}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-3 px-6 pb-6">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{formatDay(entry.date)}</p>
          <h2 className="text-2xl font-semibold tracking-tight text-balance">{entry.title}</h2>
        </div>

        <motion.div layout transition={{ duration: motionDuration(MOTION.expandSeconds, reduce), ease: EASE_OUT }}>
          <p className={expanded ? "text-base leading-relaxed text-pretty text-muted-foreground" : "line-clamp-4 text-base leading-relaxed text-pretty text-muted-foreground"}>
            {entry.explanation}
          </p>
        </motion.div>
        {entry.explanation.length > 280 ? (
          <Button variant="link" size="sm" className="h-auto px-0" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Show less" : "Read the full explanation"}
          </Button>
        ) : null}

        <Reveal index={0} className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-sm">
          <p className="text-muted-foreground">
            Credit: <span className="text-foreground">{entry.copyright ?? "NASA APOD"}</span>
          </p>
          <Button variant="outline" size="sm" asChild>
            <a href={entry.page_url} target="_blank" rel="noreferrer">
              View on NASA
              <ArrowUpRight aria-hidden="true" />
            </a>
          </Button>
        </Reveal>
      </div>
    </div>
  );
}

function ApodImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <ImageOff className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">The image could not be loaded. Use the NASA link below.</p>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-full object-cover"
    />
  );
}
