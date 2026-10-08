import { AnimatePresence, motion } from "motion/react";
import { Suspense } from "react";
import { Outlet, useLocation as useRouteLocation } from "react-router";

import { SkeletonLines } from "@/components/common/QueryBody";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { SideNav } from "@/components/layout/SideNav";
import { TopBar } from "@/components/layout/TopBar";
import { CommandPalette } from "@/components/command/CommandPalette";
import { ApodBackground } from "@/features/background/ApodBackground";
import { PlacePicker } from "@/features/location/PlacePicker";
import { EASE_OUT, MOTION, motionDuration } from "@/lib/motion";
import { useReducedMotion } from "motion/react";

/** The frame every page sits in: background, navigation, top bar, routed content, footer. */
export function AppShell() {
  const routeLocation = useRouteLocation();
  const reduce = useReducedMotion();

  return (
    <div className="relative isolate min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <ApodBackground />
      <SideNav />
      <div className="lg:pl-60">
        <TopBar />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-28 outline-none sm:px-6 lg:px-8 lg:pb-12">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={routeLocation.pathname}
              initial={{ opacity: 0, y: reduce ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: motionDuration(MOTION.pageSeconds, reduce), ease: EASE_OUT }}
            >
              <Suspense fallback={<SkeletonLines rows={6} className="py-8" />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
      <BottomNav />
      <PlacePicker />
      <CommandPalette />
    </div>
  );
}
