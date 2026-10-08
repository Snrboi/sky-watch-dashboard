import { History, Image as ImageIcon, LayoutDashboard, Satellite, ChartNoAxesColumn, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: "/", label: "Overview", shortLabel: "Overview", icon: LayoutDashboard },
  { to: "/iss", label: "ISS tracker", shortLabel: "ISS", icon: Satellite },
  { to: "/photo", label: "Photo of the day", shortLabel: "Photo", icon: ImageIcon },
  { to: "/history", label: "History", shortLabel: "History", icon: History },
  { to: "/stats", label: "Statistics", shortLabel: "Stats", icon: ChartNoAxesColumn },
];
