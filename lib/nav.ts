import {
  LayoutDashboard,
  ListChecks,
  LineChart,
  LayoutGrid,
  Flame,
  Telescope,
  Lightbulb,
  PenLine,
  NotebookPen,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** status dot key - resolved against today's status */
  status?: "report" | "affirm";
};

export type NavSection = { label: string; items: NavItem[] };

export const NAV: NavSection[] = [
  {
    label: "Command",
    items: [
      { href: "/today", label: "Today", icon: ListChecks },
      { href: "/reports/daily", label: "Daily report", icon: NotebookPen, status: "report" },
      { href: "/log", label: "Log trackers", icon: PenLine },
      { href: "/trackers", label: "Trackers", icon: LayoutGrid },
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: LineChart },
    ],
  },
  {
    label: "Practice",
    items: [
      { href: "/affirmations", label: "Affirmations", icon: Flame, status: "affirm" },
      { href: "/dreams", label: "Visualize", icon: Telescope },
      { href: "/inspiration", label: "Inspiration", icon: Lightbulb },
    ],
  },
];

// Mobile bottom-bar primary tabs
export const BOTTOM_TABS: NavItem[] = [
  { href: "/today", label: "Today", icon: ListChecks },
  { href: "/reports/daily", label: "Report", icon: NotebookPen, status: "report" },
  { href: "/trackers", label: "Trackers", icon: LayoutGrid },
  { href: "/dashboard", label: "Score", icon: LayoutDashboard },
];
