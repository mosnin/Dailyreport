import type { TrackerDraft } from "./trackers";

// The built-in daily reflection - the classic "daily report" reborn as a scored
// tracker. Every new user can add this in one tap to get scoring out of the box.
export const DAILY_REPORT_TEMPLATE: TrackerDraft = {
  name: "Daily Report",
  color: "blue",
  description: "Your end-of-day reflection, scored across mood, energy, focus and habits.",
  cadence: "daily",
  fields: [
    { key: "mood", label: "Mood", type: "scale", min: 1, max: 10, direction: "higher", weight: 0.2 },
    { key: "energy", label: "Energy", type: "scale", min: 1, max: 10, direction: "higher", weight: 0.15 },
    { key: "productivity", label: "Productivity", type: "scale", min: 1, max: 10, direction: "higher", weight: 0.25 },
    { key: "sleepHours", label: "Sleep", type: "number", unit: "hrs", min: 0, max: 12, target: 8, direction: "target", weight: 0.2 },
    { key: "moved", label: "Moved my body", type: "boolean", direction: "boolean", weight: 0.2 },
    { key: "win", label: "Today's win", type: "text", weight: 0 },
    { key: "grateful", label: "Grateful for", type: "text", weight: 0 },
  ],
};

// One-tap starting points for the cold start. The AI can refine any of them.
export const TRACKER_TEMPLATES: TrackerDraft[] = [
  DAILY_REPORT_TEMPLATE,
  {
    name: "Health",
    color: "emerald",
    description: "Sleep, movement, nutrition and energy.",
    cadence: "daily",
    fields: [
      { key: "sleepHours", label: "Sleep", type: "number", unit: "hrs", min: 0, max: 12, target: 8, direction: "target", weight: 0.3 },
      { key: "exercise", label: "Exercise", type: "duration", unit: "min", target: 30, direction: "higher", weight: 0.25 },
      { key: "nutrition", label: "Nutrition", type: "scale", min: 1, max: 10, direction: "higher", weight: 0.2 },
      { key: "energy", label: "Energy", type: "scale", min: 1, max: 10, direction: "higher", weight: 0.25 },
      { key: "note", label: "Note", type: "text", weight: 0 },
    ],
  },
  {
    name: "Money",
    color: "amber",
    description: "Spending discipline and saving.",
    cadence: "daily",
    fields: [
      { key: "spending", label: "Spending", type: "number", unit: "$", target: 50, direction: "lower", max: 300, weight: 0.4 },
      { key: "saved", label: "Saved", type: "number", unit: "$", target: 50, direction: "higher", weight: 0.3 },
      { key: "stress", label: "Money stress", type: "scale", min: 1, max: 10, direction: "lower", weight: 0.3 },
      { key: "note", label: "Note", type: "text", weight: 0 },
    ],
  },
  {
    name: "Fitness",
    color: "orange",
    description: "Training, protein and recovery.",
    cadence: "daily",
    fields: [
      { key: "workout", label: "Worked out", type: "boolean", direction: "boolean", weight: 0.4 },
      { key: "protein", label: "Protein", type: "number", unit: "g", target: 150, direction: "higher", weight: 0.3 },
      { key: "steps", label: "Steps", type: "number", target: 10000, direction: "higher", weight: 0.3 },
      { key: "note", label: "Note", type: "text", weight: 0 },
    ],
  },
  {
    name: "Mind",
    color: "violet",
    description: "Mood, stress and focus.",
    cadence: "daily",
    fields: [
      { key: "mood", label: "Mood", type: "scale", min: 1, max: 10, direction: "higher", weight: 0.4 },
      { key: "stress", label: "Stress", type: "scale", min: 1, max: 10, direction: "lower", weight: 0.3 },
      { key: "focus", label: "Focus", type: "scale", min: 1, max: 10, direction: "higher", weight: 0.3 },
      { key: "gratitude", label: "Grateful for", type: "text", weight: 0 },
    ],
  },
  {
    name: "Learning",
    color: "sky",
    description: "Studying and mastering a skill.",
    cadence: "daily",
    fields: [
      { key: "minutes", label: "Studied", type: "duration", unit: "min", target: 30, direction: "higher", weight: 0.5 },
      { key: "confidence", label: "Confidence", type: "scale", min: 1, max: 10, direction: "higher", weight: 0.3 },
      { key: "didPractice", label: "Practiced", type: "boolean", direction: "boolean", weight: 0.2 },
      { key: "note", label: "What I learned", type: "text", weight: 0 },
    ],
  },
  {
    name: "Startup",
    color: "rose",
    description: "Shipping, growth and revenue.",
    cadence: "daily",
    fields: [
      { key: "hoursShipped", label: "Deep work", type: "duration", unit: "min", target: 240, direction: "higher", weight: 0.35 },
      { key: "newUsers", label: "New users", type: "number", target: 10, direction: "higher", weight: 0.3 },
      { key: "revenue", label: "Revenue", type: "number", unit: "$", target: 100, direction: "higher", weight: 0.35 },
      { key: "note", label: "Note", type: "text", weight: 0 },
    ],
  },
];
