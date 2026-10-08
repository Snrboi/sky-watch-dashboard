import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { ApiError } from "@/lib/api";
import { MOTION, motionDuration } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RotateCw, TriangleAlert } from "lucide-react";

interface QueryBodyProps<T> {
  data: T | undefined;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  skeleton: ReactNode;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
  errorTitle?: string;
  children: (data: T) => ReactNode;
}

/**
 * Every card goes through here. It shows the skeleton while loading, the error with a retry
 * button when nothing is cached, the empty state when there is nothing to show, and otherwise
 * the content, cross-faded in from the skeleton.
 */
export function QueryBody<T>({
  data,
  isError,
  error,
  onRetry,
  skeleton,
  isEmpty,
  empty,
  errorTitle,
  children,
}: QueryBodyProps<T>) {
  const reduce = useReducedMotion();

  if (data === undefined) {
    if (isError) {
      return <ErrorState error={error} onRetry={onRetry} title={errorTitle} />;
    }
    return <>{skeleton}</>;
  }

  if (isEmpty?.(data)) {
    return <>{empty}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: motionDuration(MOTION.skeletonSeconds, reduce) }}
    >
      {children(data)}
    </motion.div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = "Couldn't load this card",
  className,
}: {
  error: unknown;
  onRetry: () => void;
  title?: string;
  className?: string;
}) {
  const message =
    error instanceof ApiError ? error.message : "Something went wrong while loading this.";
  return (
    <div role="alert" className={cn("flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4", className)}>
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="self-start" onClick={onRetry}>
        <RotateCw aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}

/** Static placeholder lines. The default shadcn skeleton pulses forever, which would be a third loop. */
export function SkeletonLines({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton
          key={index}
          className={cn("h-4 animate-none bg-white/[0.07]", index === 0 && "h-8 w-1/2", index === rows - 1 && "w-3/4")}
        />
      ))}
    </div>
  );
}
