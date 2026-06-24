"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { todayString, cn, formatDateLabel } from "@/lib/utils";
import { toast } from "sonner";
import { Trash2, BookOpen } from "lucide-react";

import { BentoCard } from "@/components/bento/BentoCard";
import { ScoreRing } from "@/components/bento/ScoreRing";
import { PageHeader } from "@/components/bento/PageHeader";
import { AreaTrend } from "@/components/charts/Charts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const ACCENT = "var(--progress)";

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function EducationReportPage() {
  const { convexUserId } = useConvexUser();

  const todaySessions = useQuery(
    api.education.getForDate,
    convexUserId ? { userId: convexUserId, date: todayString() } : "skip"
  ) as any[] | undefined;

  const recent = useQuery(
    api.education.getRecent,
    convexUserId ? { userId: convexUserId, days: 30 } : "skip"
  ) as any[] | undefined;

  const skillSummary = useQuery(
    api.education.getSkillSummary,
    convexUserId ? { userId: convexUserId } : "skip"
  ) as any[] | undefined;

  const logSession = useMutation(api.education.log);
  const removeSession = useMutation(api.education.remove);

  const [skill, setSkill] = useState("");
  const [minutes, setMinutes] = useState("");
  const [mastery, setMastery] = useState("");
  const [whatLearned, setWhatLearned] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loading = !convexUserId || todaySessions === undefined;

  async function handleSubmit() {
    if (!convexUserId) return;
    if (!skill.trim() || !minutes.trim()) {
      toast.error("Add a skill and minutes to log a session.");
      return;
    }
    const min = Number(minutes);
    if (!Number.isFinite(min) || min <= 0) {
      toast.error("Minutes must be a positive number.");
      return;
    }
    setSubmitting(true);
    try {
      await logSession({
        userId: convexUserId,
        date: todayString(),
        skill: skill.trim(),
        minutes: min,
        whatLearned: whatLearned.trim() || undefined,
        mastery: mastery.trim() ? Number(mastery) : undefined,
        notes: notes.trim() || undefined,
      });
      setSkill("");
      setMinutes("");
      setMastery("");
      setWhatLearned("");
      setNotes("");
      toast.success("Session logged.");
    } catch {
      toast.error("Could not log session.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: Id<"educationLogs">) {
    try {
      await removeSession({ id });
      toast.success("Session removed.");
    } catch {
      toast.error("Could not remove session.");
    }
  }

  // Minutes-per-day trend over last 30 days (ASC).
  const trend = (() => {
    if (!recent || recent.length === 0) return [] as { label: string; minutes: number }[];
    const map = new Map<string, number>();
    for (const s of recent) {
      map.set(s.date, (map.get(s.date) ?? 0) + (s.minutes ?? 0));
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, mins]) => ({
        label: formatDateLabel(date).replace(/, \d{4}$/, ""),
        minutes: mins,
      }));
  })();
  const trendMax = trend.reduce((m, d) => Math.max(m, d.minutes), 0);

  const inputCls =
    "w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const eyebrowCls =
    "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60";

  if (loading) {
    return (
      <div className="space-y-4 pb-6">
        <PageHeader
          eyebrow="Daily report"
          title="Education"
          subtitle="Log what you learned and keep your skills compounding."
        />
        <Skeleton className="h-64 rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        eyebrow="Daily report"
        title="Education"
        subtitle="Log what you learned and keep your skills compounding."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Log a session */}
        <BentoCard className="lg:col-span-2">
          <p className={cn(eyebrowCls, "mb-3")}>Log a session</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Skill</label>
              <input
                className={inputCls}
                placeholder="e.g. Spanish, React, Piano"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Minutes</label>
              <input
                type="number"
                min={1}
                className={inputCls}
                placeholder="30"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">Mastery</label>
              <span className="text-xs font-semibold numeral" style={{ color: ACCENT }}>
                {mastery.trim() ? `${Math.max(0, Math.min(100, Number(mastery)))}%` : "—"}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={mastery.trim() ? Number(mastery) : 0}
              onChange={(e) => setMastery(e.target.value)}
              className="w-full accent-sky-400"
              style={{ accentColor: ACCENT }}
            />
          </div>

          <div className="mt-3">
            <label className="text-xs text-muted-foreground mb-1 block">What you learned</label>
            <textarea
              className={cn(inputCls, "min-h-[72px] resize-y")}
              placeholder="Key takeaways from this session…"
              value={whatLearned}
              onChange={(e) => setWhatLearned(e.target.value)}
            />
          </div>

          <div className="mt-3">
            <label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</label>
            <textarea
              className={cn(inputCls, "min-h-[56px] resize-y")}
              placeholder="Anything else worth remembering…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Adding…" : "Add session"}
            </Button>
          </div>
        </BentoCard>

        {/* Today */}
        <BentoCard>
          <div className="flex items-center justify-between mb-3">
            <p className={eyebrowCls}>Today</p>
            <span className="text-xs text-muted-foreground numeral">
              {(todaySessions ?? []).length} · {fmtDuration(
                (todaySessions ?? []).reduce((s: number, x: any) => s + (x.minutes ?? 0), 0)
              )}
            </span>
          </div>

          {(todaySessions ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-8 text-muted-foreground">
              <BookOpen className="size-6 mb-2 opacity-50" />
              <p className="text-sm">No sessions yet today.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Log your first learning block.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {(todaySessions ?? []).map((s: any) => (
                <li
                  key={s._id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.skill}</p>
                    <p className="text-xs text-muted-foreground numeral">
                      {fmtDuration(s.minutes ?? 0)}
                      {typeof s.mastery === "number" ? ` · ${s.mastery}% mastery` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRemove(s._id)}
                    aria-label="Remove session"
                  >
                    <Trash2 className="text-muted-foreground" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </BentoCard>
      </div>

      {/* Per-skill summary */}
      <div>
        <p className={cn(eyebrowCls, "mb-2")}>Skills</p>
        {skillSummary === undefined ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-3xl" />
            ))}
          </div>
        ) : skillSummary.length === 0 ? (
          <BentoCard>
            <p className="text-sm text-muted-foreground">
              No skills tracked yet. Log a session above to start building your library.
            </p>
          </BentoCard>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {skillSummary.map((row: any, i: number) => {
              const mastery = typeof row.mastery === "number" ? row.mastery : 0;
              return (
                <BentoCard key={row.skill} delay={i * 0.04}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{row.skill}</p>
                      <p className="text-xs text-muted-foreground numeral mt-0.5">
                        {fmtDuration(row.totalMinutes ?? 0)}
                      </p>
                    </div>
                    <ScoreRing value={mastery} color={ACCENT} size={52} stroke={6}>
                      <span className="text-xs font-bold numeral">{mastery}</span>
                    </ScoreRing>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground numeral">
                    <span>{row.sessions ?? 0} sessions</span>
                    {row.lastDate && (
                      <span>{formatDateLabel(row.lastDate).replace(/, \d{4}$/, "")}</span>
                    )}
                  </div>
                </BentoCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Minutes-per-day trend */}
      {trend.length >= 2 && (
        <BentoCard>
          <p className={cn(eyebrowCls, "mb-3")}>Minutes per day · last 30 days</p>
          <AreaTrend
            data={trend}
            dataKey="minutes"
            name="Minutes"
            color={ACCENT}
            domain={[0, Math.max(trendMax, 10)]}
            suffix="m"
          />
        </BentoCard>
      )}
    </div>
  );
}
