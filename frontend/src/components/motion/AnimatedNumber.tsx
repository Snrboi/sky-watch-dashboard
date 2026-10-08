import { animate, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { formatNumber } from "@/lib/format";
import { MOTION } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number | null | undefined;
  digits?: number;
  className?: string;
}

/**
 * A number that counts to its new value when it changes (PRD 7.3). Reduced motion sets it
 * straight away. The text is written directly, so the count does not re-render React each frame.
 */
export function AnimatedNumber({ value, digits = 0, className }: AnimatedNumberProps) {
  const reduce = useReducedMotion();
  const motionValue = useMotionValue(value ?? 0);
  const ref = useRef<HTMLSpanElement>(null);
  const [initialText] = useState(() =>
    value === null || value === undefined ? "—" : formatNumber(value, digits),
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    if (value === null || value === undefined) {
      element.textContent = "—";
      return;
    }
    if (reduce) {
      motionValue.set(value);
      element.textContent = formatNumber(value, digits);
      return;
    }
    const controls = animate(motionValue, value, {
      duration: MOTION.countSeconds,
      ease: "easeOut",
      onUpdate: (latest) => {
        element.textContent = formatNumber(latest, digits);
      },
    });
    return () => controls.stop();
  }, [value, digits, reduce, motionValue]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {initialText}
    </span>
  );
}
