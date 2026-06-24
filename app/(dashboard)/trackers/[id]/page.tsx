"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { BentoCard } from "@/components/bento/BentoCard";
import { ScoreRing } from "@/components/bento/ScoreRing";
import { PageHeader } from "@/components/bento/PageHeader";
import { AreaTrend } from "@/components/charts/Charts";
import { TrackerLogForm } from "@/components/trackers/TrackerLogForm";
import { trackerColor, scoreLabel } from "@/lib/trackers";
import { todayString } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

export default function TrackerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const trackerId = params.id as Id<"trackers">;
  const { convexUserId } = useConvexUser();

  const tracker = useQuery(api.trackers.get, { trackerId });
  const todayEntry = useQuery(api.trackers.getEntry, { trackerId, date: todayString() });
  const entries = useQuery(api.trackers.getEntries, { trackerId, days: 90 });
  const logEntry = useMutation(api.trackers.logEntry);
  const removeTracker = useMutation(api.trackers.remove);

  const [values, setValues] = useState<Record<string, any>>({});
  const [prefilled, setPrefilled] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prefilled || todayEntry === undefined) return;
    if (todayEntry?.values) setValues(todayEntry.values);
    setPrefilled(true);
  }, [todayEntry, prefilled]);

  if (tracker === undefined || tracker === null) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-56" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  const color = trackerColor(tracker.color);
  const rows = entries ?? [];
  const windowDays = tracker.cadence === "weekly" ? 56 : 14;
  const cutoff = new Date(Date.now() - windowDays * 86400000).toISOString().split("T")[0];
  const recent = rows.filter((e: any) => e.date >= cutoff);
  const score = recent.length ? Math.round(recent.reduce((a: number, e: any) => a + e.score, 0) / recent.length) : null;

  const chartData = rows.map((e: any) => ({
    label: new Date(e.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: e.score,
  }));

  async function save() {
    if (!convexUserId) return;
    setSaving(true);
    try {
      await logEntry({ userId: convexUserId, trackerId, date: todayString(), values });
      toast.success("Logged");
    } catch {
      toast.error("Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!confirm(`Delete ${tracker?.name}? This removes all its data.`)) return;
    await removeTracker({ trackerId });
    router.push("/trackers");
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        eyebrow={tracker.cadence === "weekly" ? "Weekly tracker" : "Daily tracker"}
        title={`${tracker.emoji ?? ""} ${tracker.name}`.trim()}
        subtitle={tracker.description}
        action={
          <Link href="/trackers" className="text-sm text-muted-foreground hover:text-foreground">All trackers</Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Score */}
        <BentoCard className="flex flex-col items-center justify-center text-center" delay={0.02}>
          <ScoreRing value={score ?? 0} color={color} size={104}>
            <div>
              <div className="text-2xl font-bold numeral leading-none">{score ?? "-"}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Score</div>
            </div>
          </ScoreRing>
          <p className="text-xs text-muted-foreground mt-3">{score === null ? "Log to start scoring" : scoreLabel(score)}</p>
        </BentoCard>

        {/* Log form */}
        <BentoCard className="col-span-2 lg:col-span-2" delay={0.05}>
          <h2 className="font-semibold mb-4">Log {tracker.cadence === "weekly" ? "this week" : "today"}</h2>
          <TrackerLogForm fields={tracker.fields as any} values={values} onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))} accent={color} />
          <button onClick={save} disabled={saving} className="mt-5 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {saving ? "Saving..." : todayEntry ? "Update entry" : "Save entry"}
          </button>
        </BentoCard>

        {/* Quick stats */}
        <BentoCard className="flex flex-col justify-center gap-3" delay={0.08}>
          <div>
            <div className="text-2xl font-bold numeral">{rows.length}</div>
            <p className="text-xs text-muted-foreground">entries logged</p>
          </div>
          <div>
            <div className="text-2xl font-bold numeral">{recent.length}</div>
            <p className="text-xs text-muted-foreground">in last {windowDays} days</p>
          </div>
        </BentoCard>
      </div>

      {/* Trend */}
      <BentoCard delay={0.1}>
        <h2 className="font-semibold mb-3">Score over time</h2>
        {chartData.length >= 2 ? (
          <AreaTrend data={chartData} dataKey="score" name="Score" color={color} height={220} domain={[0, 100]} />
        ) : (
          <div className="grid h-[180px] place-items-center text-sm text-muted-foreground">Log a few entries to see your trend.</div>
        )}
      </BentoCard>

      <button onClick={del} className="text-xs text-muted-foreground/60 hover:text-rose-400">Delete tracker</button>
    </div>
  );
}
