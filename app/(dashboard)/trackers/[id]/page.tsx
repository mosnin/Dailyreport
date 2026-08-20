"use client";

import { useEffect, useMemo, useState } from "react";
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
import { TrackerCreator } from "@/components/trackers/TrackerCreator";
import { trackerColor, scoreLabel, contributions, type TrackerDraft } from "@/lib/trackers";
import { todayString } from "@/lib/utils";
import { toast } from "sonner";
import { Flame } from "lucide-react";
import Link from "next/link";

function formatValue(field: any, v: any): string {
  if (v === undefined || v === null || v === "") return "-";
  if (field.type === "boolean") return v === true || v === "true" ? "Yes" : "No";
  return `${v}${field.unit ? " " + field.unit : ""}`;
}

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
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (prefilled || todayEntry === undefined) return;
    if (todayEntry?.values) setValues(todayEntry.values);
    setPrefilled(true);
  }, [todayEntry, prefilled]);

  const breakdown = useMemo(
    () => (tracker ? contributions(tracker.fields as any, values) : []),
    [tracker, values]
  );

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

  // Consecutive-day logging streak (grace for the current, possibly-unlogged day).
  const dayStr = (ms: number) => new Date(ms).toISOString().split("T")[0];
  const loggedDates = new Set(rows.map((e: any) => e.date));
  let streak = 0;
  {
    let cursor = Date.now();
    if (!loggedDates.has(dayStr(cursor))) cursor -= 86400000;
    while (loggedDates.has(dayStr(cursor))) {
      streak++;
      cursor -= 86400000;
    }
  }
  const liveScore = breakdown.length
    ? Math.round(
        breakdown.reduce((a, b) => a + (b.score ?? 0) * (b.weightPct / 100), 0)
      )
    : null;

  const chartData = rows.map((e: any) => ({
    label: new Date(e.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    score: e.score,
  }));

  // ── Per-tracker analytics ──────────────────────────────────────────────────
  const nowMs = Date.now();
  const since = (days: number) => dayStr(nowMs - days * 86400000);
  const last30 = rows.filter((e: any) => e.date >= since(30));
  const avg30 = last30.length ? Math.round(last30.reduce((a: number, e: any) => a + e.score, 0) / last30.length) : null;
  const logged30 = last30.length;
  const consistency = tracker.cadence === "weekly" ? null : Math.min(100, Math.round((logged30 / 30) * 100));
  const best = rows.reduce((m: any, e: any) => (!m || e.score > m.score ? e : m), null as any);
  const last7 = rows.filter((e: any) => e.date >= since(7));
  const prev7 = rows.filter((e: any) => e.date >= since(14) && e.date < since(7));
  const avg7 = last7.length ? last7.reduce((a: number, e: any) => a + e.score, 0) / last7.length : null;
  const avgPrev7 = prev7.length ? prev7.reduce((a: number, e: any) => a + e.score, 0) / prev7.length : null;
  const momentum = avg7 != null && avgPrev7 != null ? Math.round(avg7 - avgPrev7) : null;
  const history = [...rows].sort((a: any, b: any) => b.date.localeCompare(a.date)).slice(0, 21);
  const scoredFields = (tracker.fields as any[]).filter((f) => f.type !== "text");

  const draft: TrackerDraft = {
    name: tracker.name,
    color: tracker.color,
    description: tracker.description,
    cadence: tracker.cadence,
    fields: tracker.fields as any,
  };

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

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        eyebrow={tracker.cadence === "weekly" ? "Weekly tracker" : "Daily tracker"}
        title={tracker.name}
        subtitle={tracker.description}
        action={
          <div className="flex items-center gap-3">
            <button onClick={() => setEditing((v) => !v)} className="text-sm text-muted-foreground hover:text-foreground">{editing ? "Close" : "Edit"}</button>
            <Link href="/trackers" className="text-sm text-muted-foreground hover:text-foreground">All</Link>
          </div>
        }
      />

      {editing && convexUserId && (
        <BentoCard delay={0.02}>
          <h2 className="font-semibold mb-1">Edit tracker</h2>
          <p className="text-sm text-muted-foreground mb-3">Tell the AI what to change. It updates the fields and scoring for you.</p>
          <TrackerCreator userId={convexUserId} mode="edit" trackerId={trackerId} initial={draft} showTemplates={false} onSaved={() => setEditing(false)} />
          <button
            onClick={async () => {
              if (!confirm(`Delete ${tracker?.name}? This removes all its data.`)) return;
              await removeTracker({ trackerId });
              router.push("/trackers");
            }}
            className="mt-4 text-xs text-muted-foreground/60 hover:text-rose-400"
          >
            Delete tracker
          </button>
        </BentoCard>
      )}

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
          {streak > 1 && (
            <p className="mt-2 flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Flame className="h-3.5 w-3.5" style={{ color }} />
              {streak}-day streak
            </p>
          )}
        </BentoCard>

        {/* Log form */}
        <BentoCard className="col-span-2 lg:col-span-2" delay={0.05}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Log {tracker.cadence === "weekly" ? "this week" : "today"}</h2>
            {liveScore != null && <span className="text-sm numeral text-muted-foreground">today: <span className="font-semibold text-foreground">{liveScore}</span></span>}
          </div>
          <TrackerLogForm fields={tracker.fields as any} values={values} onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))} accent={color} />
          <button onClick={save} disabled={saving} className="mt-5 w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
            {saving ? "Saving..." : todayEntry ? "Update entry" : "Save entry"}
          </button>
        </BentoCard>

        {/* Score breakdown - legible scoring */}
        <BentoCard className="flex flex-col gap-3" delay={0.08}>
          <h2 className="font-semibold">Score breakdown</h2>
          {breakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">This tracker has no scored fields.</p>
          ) : (
            <div className="space-y-2.5">
              {breakdown.map((b) => (
                <div key={b.key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">{b.label}</span>
                    <span className="numeral">{b.score === null ? "-" : b.score} <span className="text-muted-foreground/60">· {b.weightPct}%</span></span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${b.score ?? 0}%`, background: color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
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

      {/* Analytics */}
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">Analytics</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <BentoCard delay={0.02}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">30-day average</p>
            <p className="mt-1 text-2xl font-bold numeral">{avg30 ?? "-"}</p>
            <p className="text-xs text-muted-foreground">{avg30 != null ? scoreLabel(avg30) : "No data yet"}</p>
          </BentoCard>
          <BentoCard delay={0.04}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Momentum</p>
            <p className="mt-1 text-2xl font-bold numeral" style={{ color: momentum != null && momentum !== 0 ? (momentum > 0 ? "var(--primary)" : "oklch(0.7 0.18 16)") : undefined }}>
              {momentum == null ? "-" : `${momentum > 0 ? "+" : ""}${momentum}`}
            </p>
            <p className="text-xs text-muted-foreground">vs the prior week</p>
          </BentoCard>
          <BentoCard delay={0.06}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{tracker.cadence === "weekly" ? "Logged (30d)" : "Consistency"}</p>
            <p className="mt-1 text-2xl font-bold numeral">{consistency != null ? `${consistency}%` : logged30}</p>
            <p className="text-xs text-muted-foreground">{logged30} {logged30 === 1 ? "entry" : "entries"} in 30 days</p>
          </BentoCard>
          <BentoCard delay={0.08}>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Best day</p>
            <p className="mt-1 text-2xl font-bold numeral">{best ? best.score : "-"}</p>
            <p className="text-xs text-muted-foreground">{best ? new Date(best.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No data yet"}</p>
          </BentoCard>
        </div>
      </div>

      {/* History */}
      <BentoCard delay={0.12}>
        <h2 className="font-semibold mb-3">History</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet. Log above to start your history.</p>
        ) : (
          <div className="divide-y divide-border/40">
            {history.map((e: any) => {
              const preview = scoredFields
                .filter((f) => e.values?.[f.key] !== undefined && e.values?.[f.key] !== "")
                .slice(0, 4)
                .map((f) => `${f.label} ${formatValue(f, e.values[f.key])}`)
                .join("  ·  ");
              return (
                <div key={e._id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
                    {new Date(e.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                  <p className="flex-1 min-w-0 truncate text-xs text-muted-foreground">{preview || "Logged"}</p>
                  <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold numeral" style={{ color, background: `color-mix(in oklch, ${color} 14%, transparent)` }}>
                    {e.score}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </BentoCard>
    </div>
  );
}
