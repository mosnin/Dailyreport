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
