import {
  HeartPulse,
  Crosshair,
  Wallet,
  Brain,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type AreaKey = "health" | "goals" | "finance" | "emotional" | "progress" | "execution";

export type AreaMeta = {
  key: AreaKey;
  label: string;
  /** CSS color variable, e.g. "var(--health)" */
  color: string;
  /** Tailwind text color via arbitrary value */
  icon: LucideIcon;
  blurb: string;
  href: string;
};

export const AREAS: Record<AreaKey, AreaMeta> = {
  execution: {
    key: "execution",
    label: "Execution",
    color: "var(--execution)",
    icon: Zap,
    blurb: "Showing up — reports, rituals, problems solved.",
    href: "/reports/daily",
  },
  health: {
    key: "health",
    label: "Health",
    color: "var(--health)",
    icon: HeartPulse,
    blurb: "Sleep, movement, nutrition and energy.",
    href: "/health",
  },
  goals: {
    key: "goals",
    label: "Goals",
    color: "var(--goals)",
    icon: Crosshair,
    blurb: "Progress across short, mid and long horizons.",
    href: "/goals",
  },
  finance: {
    key: "finance",
    label: "Finance",
    color: "var(--finance)",
    icon: Wallet,
    blurb: "Savings rate, spending discipline, money stress.",
    href: "/finances",
  },
  emotional: {
    key: "emotional",
    label: "Emotional",
    color: "var(--emotional)",
    icon: Brain,
    blurb: "Your emotional bank account — mood, stress, recovery.",
    href: "/affirmations",
  },
  progress: {
    key: "progress",
    label: "Progress",
    color: "var(--progress)",
    icon: TrendingUp,
    blurb: "Forward motion — projects, learning, overcoming fears.",
    href: "/projects",
  },
};

export const AREA_ORDER: AreaKey[] = ["execution", "health", "goals", "finance", "emotional", "progress"];

export function scoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Steady";
  if (score >= 40) return "Building";
  if (score >= 20) return "Needs work";
  return "Critical";
}

export function creditLabel(credit: number): string {
  if (credit >= 800) return "Exceptional";
  if (credit >= 740) return "Very good";
  if (credit >= 670) return "Good";
  if (credit >= 580) return "Fair";
  return "Building";
}
