"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { todayString, cn } from "@/lib/utils";
import { toast } from "sonner";
import { PageHeader } from "@/components/bento/PageHeader";
import { BentoCard } from "@/components/bento/BentoCard";
import { ScoreRing } from "@/components/bento/ScoreRing";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { scoreLabel } from "@/lib/areas";
import { Check } from "lucide-react";

const ACCENT = "var(--health)";
const SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60";
const INPUT =
  "w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

/** Reusable 1-10 selector. Selected button filled with the section accent. */
function Scale({
  value,
  onChange,
  accent = ACCENT,
}: {
  value: number | "";
  onChange: (v: number) => void;
  accent?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
        const selected = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              "h-9 w-9 rounded-xl border text-sm font-semibold numeral transition-colors",
              selected
                ? "border-transparent text-[oklch(0.2_0.03_264)]"
                : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
            )}
            style={selected ? { background: accent } : undefined}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

type State = {
  sleepHours: string;
  exerciseMinutes: string;
  exerciseType: string;
  nutrition: number | "";
  water: string;
  weight: string;
  energy: number | "";
  mood: number | "";
  stress: number | "";
  win: string;
  gratitude: string;
  notes: string;
};

const EMPTY: State = {
  sleepHours: "",
  exerciseMinutes: "",
  exerciseType: "",
  nutrition: "",
  water: "",
  weight: "",
  energy: "",
  mood: "",
  stress: "",
  win: "",
  gratitude: "",
  notes: "",
};

export default function HealthReportPage() {
  const { convexUserId } = useConvexUser();
  const date = todayString();

  const existing = useQuery(
    api.health.getForDate,
    convexUserId ? { userId: convexUserId, date } : "skip"
  );
  const lifeScore = useQuery(
    api.lifeScore.getCurrent,
    convexUserId ? { userId: convexUserId, windowDays: 30 } : "skip"
  );
  const upsert = useMutation(api.health.upsert);

  const [form, setForm] = useState<State>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Hydrate local state once the query resolves.
  useEffect(() => {
    if (existing === undefined || hydrated) return;
    const e: any = existing;
    if (e) {
      setForm({
        sleepHours: e.sleepHours != null ? String(e.sleepHours) : "",
        exerciseMinutes: e.exerciseMinutes != null ? String(e.exerciseMinutes) : "",
        exerciseType: e.exerciseType ?? "",
        nutrition: e.nutrition ?? "",
        water: e.water != null ? String(e.water) : "",
        weight: e.weight != null ? String(e.weight) : "",
        energy: e.energy ?? "",
        mood: e.mood ?? "",
        stress: e.stress ?? "",
        win: e.win ?? "",
        gratitude: e.gratitude ?? "",
        notes: e.notes ?? "",
      });
    }
    setHydrated(true);
  }, [existing, hydrated]);

  const set = <K extends keyof State>(key: K, value: State[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const healthArea: any = lifeScore?.areas?.find((a: any) => a.key === "health");
  const hasScore = !!healthArea && !healthArea.needsData;

  async function handleSave() {
    if (!convexUserId) return;
    setSaving(true);

    const num = (v: string) => {
      if (v.trim() === "") return undefined;
      const n = Number(v);
      return Number.isNaN(n) ? undefined : n;
    };
    const str = (v: string) => (v.trim() === "" ? undefined : v.trim());
    const scale = (v: number | "") => (v === "" ? undefined : v);

    try {
      await upsert({
        userId: convexUserId,
        date,
        sleepHours: num(form.sleepHours),
        exerciseMinutes: num(form.exerciseMinutes),
        exerciseType: str(form.exerciseType),
        nutrition: scale(form.nutrition),
        water: num(form.water),
        weight: num(form.weight),
        energy: scale(form.energy),
        mood: scale(form.mood),
        stress: scale(form.stress),
        win: str(form.win),
        gratitude: str(form.gratitude),
        notes: str(form.notes),
      });
      toast.success("Health logged");
      setSavedAt(Date.now());
    } catch {
      toast.error("Could not save check-in");
    } finally {
      setSaving(false);
    }
  }

  // Loading state.
  if (!convexUserId || existing === undefined) {
    return (
      <div className="space-y-4 pb-6">
        <PageHeader
          eyebrow="Daily report"
          title="Health & wellness"
          subtitle="Log how your body and mind are doing today."
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Skeleton className="col-span-2 lg:col-span-3 h-72 rounded-3xl" />
          <Skeleton className="col-span-2 lg:col-span-1 h-72 rounded-3xl" />
          <Skeleton className="col-span-2 lg:col-span-4 h-56 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        eyebrow="Daily report"
        title="Health & wellness"
        subtitle="Log how your body and mind are doing today."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Physical */}
        <BentoCard className="col-span-2 lg:col-span-3" delay={0.02}>
          <p className={SECTION_LABEL}>Physical</p>
          <h2 className="font-semibold mt-1 mb-4">How your body is doing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Sleep (hours)">
              <input
                type="number"
                step={0.5}
                min={0}
                value={form.sleepHours}
                onChange={(e) => set("sleepHours", e.target.value)}
                placeholder="7.5"
                className={INPUT}
              />
            </Field>
            <Field label="Water (glasses)">
              <input
                type="number"
                min={0}
                value={form.water}
                onChange={(e) => set("water", e.target.value)}
                placeholder="8"
                className={INPUT}
              />
            </Field>
            <Field label="Exercise (minutes)">
              <input
                type="number"
                min={0}
                value={form.exerciseMinutes}
                onChange={(e) => set("exerciseMinutes", e.target.value)}
                placeholder="30"
                className={INPUT}
              />
            </Field>
            <Field label="Exercise type">
              <input
                type="text"
                value={form.exerciseType}
                onChange={(e) => set("exerciseType", e.target.value)}
                placeholder="Run, lifting, yoga…"
                className={INPUT}
              />
            </Field>
            <Field label="Weight (optional)">
              <input
                type="number"
                step={0.1}
                min={0}
                value={form.weight}
                onChange={(e) => set("weight", e.target.value)}
                placeholder="-"
                className={INPUT}
              />
            </Field>
          </div>

          <div className="mt-5 space-y-2">
            <span className="text-xs text-muted-foreground">Nutrition (1-10)</span>
            <Scale
              value={form.nutrition}
              onChange={(v) => set("nutrition", v)}
            />
          </div>
        </BentoCard>

        {/* Today's score */}
        <div className="col-span-2 lg:col-span-1">
          {hasScore ? (
            <BentoCard className="h-full flex flex-col items-center justify-center text-center" delay={0.04}>
              <p className={SECTION_LABEL}>Today&apos;s health score</p>
              <div className="my-3">
                <ScoreRing value={healthArea.score} color={ACCENT} size={120}>
                  <div className="text-center">
                    <p className="text-2xl font-bold numeral" style={{ color: ACCENT }}>
                      {Math.round(healthArea.score)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">/ 100</p>
                  </div>
                </ScoreRing>
              </div>
              <p className="text-sm font-semibold">{scoreLabel(healthArea.score)}</p>
            </BentoCard>
          ) : (
            <BentoCard className="h-full flex flex-col items-center justify-center text-center" delay={0.04}>
              <p className={SECTION_LABEL}>Today&apos;s health score</p>
              <p className="text-sm text-muted-foreground mt-3">
                Log a few days to unlock your health score.
              </p>
            </BentoCard>
          )}
        </div>

        {/* Energy & mind */}
        <BentoCard className="col-span-2 lg:col-span-4" delay={0.06}>
          <p className={SECTION_LABEL}>Energy &amp; mind</p>
          <h2 className="font-semibold mt-1 mb-4">Tune in to how you feel</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Energy (1-10)</span>
              <Scale value={form.energy} onChange={(v) => set("energy", v)} />
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Mood (1-10)</span>
              <Scale value={form.mood} onChange={(v) => set("mood", v)} />
            </div>
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">
                Stress (1-10, higher is worse)
              </span>
              <Scale value={form.stress} onChange={(v) => set("stress", v)} />
            </div>
          </div>
        </BentoCard>

        {/* Reflection */}
        <BentoCard className="col-span-2 lg:col-span-4" delay={0.08}>
          <p className={SECTION_LABEL}>Reflection</p>
          <h2 className="font-semibold mt-1 mb-4">Close the loop on your day</h2>
          <div className="space-y-4">
            <Field label="Today's win">
              <input
                type="text"
                value={form.win}
                onChange={(e) => set("win", e.target.value)}
                placeholder="One thing that went well…"
                className={INPUT}
              />
            </Field>
            <Field label="Gratitude">
              <textarea
                rows={3}
                value={form.gratitude}
                onChange={(e) => set("gratitude", e.target.value)}
                placeholder="What are you grateful for today?"
                className={cn(INPUT, "resize-none")}
              />
            </Field>
            <Field label="Notes">
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Anything else worth noting…"
                className={cn(INPUT, "resize-none")}
              />
            </Field>
          </div>
        </BentoCard>
      </div>

      {/* Footer save */}
      <div className="sticky bottom-3 z-10 flex items-center justify-end gap-3">
        {savedAt && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 backdrop-blur border border-border px-3 py-1.5 text-xs font-medium" style={{ color: ACCENT }}>
            <Check className="size-3.5" /> Saved
          </span>
        )}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-full px-6 py-2 h-auto text-[oklch(0.2_0.03_264)] font-semibold shadow-lg"
          style={{ background: ACCENT }}
        >
          {saving ? "Saving…" : "Save check-in"}
        </Button>
      </div>
    </div>
  );
}
