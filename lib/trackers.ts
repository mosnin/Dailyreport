// Palette keys the AI can choose from, mapped to display colors.
export const TRACKER_COLORS: Record<string, string> = {
  sky: "#56b6ff",
  emerald: "#34d399",
  violet: "#a78bfa",
  amber: "#fbbf24",
  rose: "#fb7185",
  orange: "#fb923c",
  blue: "#60a5fa",
  pink: "#f472b6",
  lime: "#a3e635",
  cyan: "#22d3ee",
  indigo: "#818cf8",
  teal: "#2dd4bf",
};

export function trackerColor(key?: string): string {
  return TRACKER_COLORS[key ?? ""] ?? TRACKER_COLORS.sky;
}

export type TrackerField = {
  key: string;
  label: string;
  type: "number" | "scale" | "boolean" | "duration" | "text";
  unit?: string;
  min?: number;
  max?: number;
  target?: number;
  direction?: "higher" | "lower" | "target" | "boolean";
  weight: number;
};

export type TrackerDraft = {
  name: string;
  emoji?: string;
  color: string;
  description?: string;
  cadence: "daily" | "weekly";
  fields: TrackerField[];
};

export function scoreLabel(score: number): string {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Steady";
  if (score >= 40) return "Building";
  if (score >= 20) return "Needs work";
  return "Critical";
}

const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

// Pure mirror of convex/trackers.ts scoreField, for legible UI breakdowns.
export function scoreField(field: TrackerField, value: any): number | null {
  if (value === undefined || value === null || value === "") return null;
  if ((field.weight ?? 0) <= 0 || field.type === "text") return null;
  if (field.type === "boolean") {
    const on = value === true || value === "true";
    return field.direction === "lower" ? (on ? 0 : 100) : on ? 100 : 0;
  }
  const num = Number(value);
  if (Number.isNaN(num)) return null;
  if (field.type === "scale") {
    const min = field.min ?? 1;
    const max = field.max ?? 10;
    const t = (num - min) / Math.max(max - min, 1);
    return clamp((field.direction === "lower" ? 1 - t : t) * 100);
  }
  const dir = field.direction ?? "higher";
  if (dir === "lower") {
    const target = field.target ?? 0;
    if (num <= target) return 100;
    const ref = (field.max ?? target * 2) - target || 1;
    return clamp(100 - ((num - target) / ref) * 100);
  }
  if (dir === "target") {
    const target = field.target ?? num;
    const range = (field.max ?? target * 1.5) - (field.min ?? 0) || 1;
    return clamp(100 - (Math.abs(num - target) / range) * 100);
  }
  const target = field.target ?? field.max ?? num;
  if (target <= 0) return num > 0 ? 100 : 0;
  return clamp((num / target) * 100);
}

/** Per-field contribution breakdown for a single entry's values. */
export function contributions(fields: TrackerField[], values: Record<string, any>) {
  const scored = fields.filter((f) => (f.weight ?? 0) > 0);
  const wsum = scored.reduce((a, f) => a + (f.weight ?? 0), 0) || 1;
  return scored.map((f) => {
    const s = scoreField(f, values?.[f.key]);
    return {
      key: f.key,
      label: f.label,
      score: s,
      weightPct: Math.round(((f.weight ?? 0) / wsum) * 100),
    };
  });
}
