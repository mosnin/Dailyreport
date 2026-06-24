import {
  LayoutDashboard,
  ListChecks,
  LineChart,
  NotepadText,
  HeartPulse,
  GraduationCap,
  FolderKanban,
  BookOpen,
  Crosshair,
  Wallet,
  Sparkles,
  Users,
  Flame,
  Telescope,
  Lightbulb,
  Brain,
  CalendarDays,
  Activity,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** status dot key — resolved against today's status */
  status?: "report" | "affirm";
};

export type NavSection = { label: string; items: NavItem[] };

export const NAV: NavSection[] = [
  {
    label: "Command",
    items: [
      { href: "/today", label: "Today", icon: ListChecks },
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: LineChart },
    ],
  },
  {
    label: "Daily reports",
    items: [
      { href: "/reports/daily", label: "Daily Report", icon: NotepadText, status: "report" },
      { href: "/reports/health", label: "Health & Wellness", icon: HeartPulse },
      { href: "/reports/education", label: "Education", icon: GraduationCap },
      { href: "/reports/projects", label: "Project Progress", icon: FolderKanban },
      { href: "/reports/weekly", label: "Weekly Review", icon: BookOpen },
    ],
  },
  {
    label: "Life domains",
    items: [
      { href: "/goals", label: "Goals", icon: Crosshair },
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/health", label: "Health", icon: Activity },
      { href: "/finances", label: "Finances", icon: Wallet },
      { href: "/growth", label: "Skills & Fears", icon: Sparkles },
      { href: "/people", label: "People", icon: Users },
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
  {
    label: "Reflect",
    items: [
      { href: "/patterns", label: "Patterns", icon: Brain },
      { href: "/calendar", label: "History", icon: CalendarDays },
    ],
  },
];

// Mobile bottom-bar primary tabs
export const BOTTOM_TABS: NavItem[] = [
  { href: "/today", label: "Today", icon: ListChecks },
  { href: "/reports/daily", label: "Report", icon: NotepadText, status: "report" },
  { href: "/dashboard", label: "Score", icon: LayoutDashboard },
  { href: "/goals", label: "Goals", icon: Crosshair },
];
