import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, startOfWeek } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayString(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function currentWeekStartString(): string {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function isSunday(date: Date = new Date()): boolean {
  return date.getDay() === 0;
}

export function nextSundayDate(): Date {
  const d = new Date();
  const daysUntilSunday = (7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSunday);
  return d;
}

export function formatDateLabel(dateStr: string): string {
  return format(new Date(dateStr + "T12:00:00"), "MMMM d, yyyy");
}

// ── Goals period keys ────────────────────────────────────────────────────────

export type GoalCategory = "yearly" | "quarterly" | "monthly" | "weekly";

export function currentPeriodKey(category: GoalCategory): string {
  const now = new Date();
  switch (category) {
    case "yearly":
      return String(now.getFullYear());
    case "quarterly": {
      const q = Math.ceil((now.getMonth() + 1) / 3);
      return `${now.getFullYear()}-Q${q}`;
    }
    case "monthly":
      return format(now, "yyyy-MM");
    case "weekly":
      return currentWeekStartString();
  }
}

export function previousPeriodKey(category: GoalCategory, periodKey: string): string | null {
  switch (category) {
    case "yearly":
      return String(parseInt(periodKey) - 1);
    case "quarterly": {
      const [year, qPart] = periodKey.split("-");
      const q = parseInt(qPart.replace("Q", ""));
      return q === 1 ? `${parseInt(year) - 1}-Q4` : `${year}-Q${q - 1}`;
    }
    case "monthly": {
      const [y, m] = periodKey.split("-").map(Number);
      return m === 1
        ? `${y - 1}-12`
        : `${y}-${String(m - 1).padStart(2, "0")}`;
    }
    case "weekly": {
      const d = new Date(periodKey + "T12:00:00");
      d.setDate(d.getDate() - 7);
      return format(d, "yyyy-MM-dd");
    }
  }
}

export function nextPeriodKey(category: GoalCategory, periodKey: string): string | null {
  const current = currentPeriodKey(category);
  if (periodKey >= current) return null;
  switch (category) {
    case "yearly":
      return String(parseInt(periodKey) + 1);
    case "quarterly": {
      const [year, qPart] = periodKey.split("-");
      const q = parseInt(qPart.replace("Q", ""));
      return q === 4 ? `${parseInt(year) + 1}-Q1` : `${year}-Q${q + 1}`;
    }
    case "monthly": {
      const [y, m] = periodKey.split("-").map(Number);
      return m === 12
        ? `${y + 1}-01`
        : `${y}-${String(m + 1).padStart(2, "0")}`;
    }
    case "weekly": {
      const d = new Date(periodKey + "T12:00:00");
      d.setDate(d.getDate() + 7);
      return format(d, "yyyy-MM-dd");
    }
  }
}

const QUARTER_MONTHS: Record<number, string> = {
  1: "Jan – Mar",
  2: "Apr – Jun",
  3: "Jul – Sep",
  4: "Oct – Dec",
};

export function periodLabel(category: GoalCategory, periodKey: string): string {
  switch (category) {
    case "yearly":
      return periodKey; // "2026"
    case "quarterly": {
      // "2026-Q2" → "Q2 2026 · Apr – Jun"
      const [year, qPart] = periodKey.split("-");
      const qNum = parseInt(qPart.replace("Q", ""));
      return `${qPart} ${year} · ${QUARTER_MONTHS[qNum]}`;
    }
    case "monthly":
      // "2026-04" → "April 2026"
      return format(new Date(periodKey + "-01"), "MMMM yyyy");
    case "weekly":
      // "2026-04-28" → "Week of Apr 28, 2026"
      return `Week of ${format(new Date(periodKey + "T12:00:00"), "MMM d, yyyy")}`;
  }
}
