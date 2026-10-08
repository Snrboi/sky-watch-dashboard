import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";

import { EASE_OUT, MOTION, motionDuration } from "@/lib/motion";

interface RevealProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate"> {
  /** Position in the stagger. Cards arrive 50 ms apart (PRD 7.3). */
  index?: number;
}

/** Fades a block in once when it first appears. Reduced motion makes it instant. */
export function Reveal({ index = 0, children, ...props }: RevealProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduce ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: motionDuration(MOTION.revealSeconds, reduce),
        delay: motionDuration(index * MOTION.staggerSeconds, reduce),
        ease: EASE_OUT,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
