import { motion } from "motion/react";
import { Telescope } from "lucide-react";
import { NavLink } from "react-router";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

/** Desktop sidebar (1024 px and up). The active indicator slides between items. */
export function SideNav() {
  return (
    <aside
      aria-label="Primary"
      className="glass fixed inset-y-0 left-0 z-40 hidden w-60 flex-col gap-8 border-r p-4 lg:flex"
    >
      <div className="flex items-center gap-2.5 px-2 pt-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-sky/15 text-sky">
          <Telescope className="size-4" aria-hidden="true" />
        </span>
        <span className="text-base font-semibold tracking-tight">Sky Watch</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive ? (
                  <motion.span
                    layoutId="side-nav-indicator"
                    className="absolute inset-0 rounded-lg bg-white/10"
                    transition={{ type: "spring", stiffness: 480, damping: 38 }}
                  />
                ) : null}
                <item.icon className="relative size-4" aria-hidden="true" />
                <span className="relative">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
