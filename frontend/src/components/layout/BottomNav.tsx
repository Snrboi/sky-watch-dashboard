import { motion } from "motion/react";
import { NavLink } from "react-router";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

/** Mobile bar (below 1024 px). Same destinations as the sidebar. */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="glass fixed inset-x-3 bottom-3 z-40 flex items-stretch justify-around gap-1 rounded-2xl p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            cn(
              "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive ? "text-foreground" : "text-muted-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              {isActive ? (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute inset-0 rounded-xl bg-white/10"
                  transition={{ type: "spring", stiffness: 480, damping: 38 }}
                />
              ) : null}
              <item.icon className="relative size-5" aria-hidden="true" />
              <span className="relative truncate">{item.shortLabel}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
