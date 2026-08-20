"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { BentoCard } from "@/components/bento/BentoCard";
import { PageHeader } from "@/components/bento/PageHeader";
import { TrackerLogForm } from "@/components/trackers/TrackerLogForm";
import { TrackerMark } from "@/components/trackers/TrackerMark";
import { trackerColor, scoreField } from "@/lib/trackers";
import { todayString } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function LogTodayPage() {
  const router = useRouter();
  const { convexUserId } = useConvexUser();
  const today = todayString();

  const due = useQuery(api.trackers.getDueToday, convexUserId ? { userId: convexUserId, date: today } : "skip");
  const logEntry = useMutation(api.trackers.logEntry);

  const [step, setStep] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, Record<string, any>>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [seeded, setSeeded] = useState(false);
  const [saving, setSaving] = useState(false);

  // Seed drafts from any values already logged today.
  useEffect(() => {
    if (seeded || due === undefined) return;
    const init: Record<string, Record<string, any>> = {};
    const done: Record<string, boolean> = {};
    for (const t of due) {
      init[t._id] = { ...(t.values ?? {}) };
      if (t.done) done[t._id] = true;
    }
    setDrafts(init);
    setSaved(done);
    setSeeded(true);
  }, [due, seeded]);

  const liveScore = useMemo(() => {
    if (!due || !due[step]) return null;
    const t = due[step];
    const values = drafts[t._id] ?? {};
    let sum = 0;
    let wsum = 0;
    for (const f of t.fields as any[]) {
      const w = f.weight ?? 0;
      if (w <= 0) continue;
      const s = scoreField(f, values[f.key]);
      if (s === null) continue;
      sum += s * w;
      wsum += w;
    }
    return wsum > 0 ? Math.round(sum / wsum) : null;
  }, [due, step, drafts]);

  if (!convexUserId || due === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    );
  }

  if (due.length === 0) {
    return (
      <div className="space-y-4 pb-6">
        <PageHeader eyebrow="Log today" title="Nothing due" subtitle="You have no daily trackers yet." />
        <BentoCard className="text-center py-10">
          <p className="font-semibold">No daily trackers</p>
          <p className="text-sm text-muted-foreground mt-1">
            Set one up in <Link href="/trackers" className="text-primary">Trackers</Link> and it will appear here every day.
          </p>
        </BentoCard>
      </div>
    );
  }

  const tracker = due[step];
  const color = trackerColor(tracker.color);
  const values = drafts[tracker._id] ?? {};
  const isLast = step === due.length - 1;
  const allDone = due.every((t) => saved[t._id]);

  async function saveCurrent(advance: boolean) {
    if (!convexUserId) return;
    setSaving(true);
    try {
      await logEntry({ userId: convexUserId, trackerId: tracker._id, date: today, values: drafts[tracker._id] ?? {} });
      setSaved((p) => ({ ...p, [tracker._id]: true }));
      if (advance && !isLast) {
        setStep((s) => s + 1);
      } else if (advance && isLast) {
        toast.success("All logged for today");
        router.push("/today");
      }
    } catch {
      toast.error("Could not save that one.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        eyebrow="Log today"
        title="One pass, every tracker"
        subtitle="Fill each tracker and move on. Takes seconds."
        action={<Link href="/today" className="text-sm text-muted-foreground hover:text-foreground">Done</Link>}
      />

      {/* Progress dots */}
      <div className="flex items-center gap-1.5">
        {due.map((t, i) => (
          <button
            key={t._id}
            onClick={() => setStep(i)}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i === step ? "" : saved[t._id] ? "" : "bg-muted"
            )}
            style={
              i === step
                ? { background: color }
                : saved[t._id]
                ? { background: "color-mix(in oklch, var(--primary) 50%, transparent)" }
                : undefined
            }
            aria-label={`Go to ${t.name}`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tracker._id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          <BentoCard>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <TrackerMark name={tracker.name} color={tracker.color} size={40} />
                <div>
                  <h2 className="font-semibold leading-tight">{tracker.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    Tracker {step + 1} of {due.length}
                    {saved[tracker._id] && <span className="ml-2 text-primary">saved</span>}
                  </p>
                </div>
              </div>
              {liveScore != null && (
                <div className="text-right">
                  <div className="text-2xl font-bold numeral leading-none">{liveScore}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">score</div>
                </div>
              )}
            </div>

            <TrackerLogForm
              fields={tracker.fields as any}
              values={values}
              onChange={(k, val) => setDrafts((p) => ({ ...p, [tracker._id]: { ...(p[tracker._id] ?? {}), [k]: val } }))}
              accent={color}
            />

            <div className="mt-6 flex items-center gap-2">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                Back
              </button>
              {!isLast && (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  Skip
                </button>
              )}
              <button
                onClick={() => saveCurrent(true)}
                disabled={saving}
                className="ml-auto flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? "Saving..." : isLast ? "Save and finish" : "Save and next"}
              </button>
            </div>
          </BentoCard>
        </motion.div>
      </AnimatePresence>

      {allDone && (
        <BentoCard className="flex items-center gap-3" delay={0.04}>
          <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: "var(--primary)" }}>
            <Check className="h-5 w-5 text-[oklch(0.16_0.02_264)]" strokeWidth={3} />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">Everything logged for today</p>
            <p className="text-xs text-muted-foreground">Nice work. Your scores are up to date.</p>
          </div>
          <Link href="/today" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold">Home</Link>
        </BentoCard>
      )}
    </div>
  );
}
