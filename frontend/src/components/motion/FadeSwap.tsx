import { AnimatePresence, motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

import { MOTION, motionDuration } from "@/lib/motion";

interface FadeSwapProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate" | "exit"> {
  /** When this key changes, the old content fades out while the new content fades in. */
  swapKey: string;
}

/** Cross-fades between two keyed blocks, for example when the chosen city changes (PRD 7.3). */
export function FadeSwap({ swapKey, children, ...props }: FadeSwapProps) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.div
        key={swapKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: motionDuration(MOTION.citySwapSeconds, reduce) }}
        {...props}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
