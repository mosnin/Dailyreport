"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, todayString } from "@/lib/utils";
import { motion } from "motion/react";
import { BentoCard } from "@/components/bento/BentoCard";
import { ScoreRing } from "@/components/bento/ScoreRing";
import { PageHeader } from "@/components/bento/PageHeader";
import { TrackerCreator } from "@/components/trackers/TrackerCreator";
import { QuickStartDailyReport } from "@/components/trackers/QuickStart";
import { TrackerMark } from "@/components/trackers/TrackerMark";
import { trackerColor, scoreLabel, trackerInitial } from "@/lib/trackers";
import { Check, Flame, PenLine } from "lucide-react";
import Link from "next/link";

function greet(name: string) {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${name}`;
  if (h < 17) return `Good afternoon, ${name}`;
  return `Good evening, ${name}`;
}

export default function TodayPage() {
  const { convexUserId } = useConvexUser();
  const { user } = useUser();
  const firstName = user?.firstName ?? user?.fullName?.split(" ")[0] ?? "there";
  const today = todayString();

  const overview = useQuery(api.trackers.getOverview, convexUserId ? { userId: convexUserId } : "skip");
  const checklist = useQuery(api.trackers.getTodayChecklist, convexUserId ? { userId: convexUserId, date: today } : "skip");
  const brief = useQuery(api.aiInternal.getDailyBriefPublic, convexUserId ? { userId: convexUserId, date: today } : "skip");
  const coach = useQuery(api.trackerAI.getCoachInsight, convexUserId ? { userId: convexUserId, date: today } : "skip");
  const runCoach = useAction(api.trackerAI.coach);
  const rituals = useQuery(api.rituals.list, convexUserId ? { userId: convexUserId } : "skip") ?? [];
  const ritualLog = useQuery(api.rituals.getLog, convexUserId ? { userId: convexUserId, date: today } : "skip");
  const toggleRitual = useMutation(api.rituals.toggle);

  // Proactive coach: generate today's insight once if it's missing and there's
  // at least one scored tracker to talk about.
  const coachKicked = useRef(false);
  useEffect(() => {
    if (coachKicked.current) return;
    if (!convexUserId || coach === undefined || coach !== null) return;
    if (!overview?.hasScored) return;
    coachKicked.current = true;
    runCoach({ userId: convexUserId, date: today }).catch(() => {});
  }, [convexUserId, coach, overview?.hasScored, runCoach, today]);

  if (!convexUserId || overview === undefined || checklist === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  const trackers = overview?.trackers ?? [];

  // First run: no trackers yet -> set the app up around the user.
  if (trackers.length === 0) {
    return (
      <div className="space-y-4 pb-6">
        <PageHeader eyebrow={new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())} title={greet(firstName)} subtitle="Let's set up what you want to measure. This becomes your whole app." />
        <BentoCard delay={0.03}>
          <h2 className="font-semibold mb-1">Start in one tap</h2>
          <p className="text-sm text-muted-foreground mb-3">The built-in Daily Report scores your day across mood, energy, focus and habits.</p>
          {convexUserId && <QuickStartDailyReport userId={convexUserId} />}
        </BentoCard>
        <BentoCard delay={0.06}>
          <h2 className="font-semibold mb-1">Or describe your own</h2>
          <p className="text-sm text-muted-foreground mb-3">Tell the AI what you want to track. It designs the log and the scoring for you, and the rest of the app organizes around it.</p>
          {convexUserId && <TrackerCreator userId={convexUserId} />}
        </BentoCard>
      </div>
    );
  }

  const items = checklist ?? [];
  const doneCount = items.filter((i: any) => i.done).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const completedIds: string[] = ritualLog?.completedIds ?? [];

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}
        title={greet(firstName)}
        subtitle="Your daily checklist - log these to keep every tracker climbing."
        action={
          total > 0 ? (
            <Link
              href="/log"
              className="flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <PenLine className="h-4 w-4" />
              {doneCount >= total ? "Review today" : "Log today"}
            </Link>
          ) : undefined
        }
      />

      {/* Proactive AI coach */}
      {coach && (
        <BentoCard delay={0.01}>
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
              style={{
                background:
                  coach.tone === "win" ? "var(--primary)" : coach.tone === "warn" ? "var(--rose, oklch(0.7 0.18 16))" : "var(--muted-foreground)",
              }}
            />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">Coach</span>
                {coach.focusTrackerId && (
                  <Link href={`/trackers/${coach.focusTrackerId}`} className="text-xs text-muted-foreground hover:text-foreground">Open</Link>
                )}
              </div>
              <p className="mt-1 font-semibold leading-tight">{coach.headline}</p>
              <p className="mt-1 text-sm text-muted-foreground leading-snug">{coach.body}</p>
            </div>
          </div>
        </BentoCard>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Checklist */}
        <BentoCard className="col-span-2 lg:col-span-2 lg:row-span-2" delay={0.02}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Today&apos;s checklist</h2>
            <span className="text-sm font-semibold numeral text-muted-foreground">{doneCount}/{total}</span>
          </div>
          {total > 0 ? (
            <>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-4">
                <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
              </div>
              <div className="space-y-1.5">
                {items.map((item: any) => (
                  <Link key={item._id} href={`/trackers/${item._id}`} className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors", item.done ? "bg-white/5" : "hover:bg-white/5")}>
                    <span
                      className="grid h-7 w-7 place-items-center rounded-xl text-xs font-semibold shrink-0"
                      style={
                        item.done
                          ? { background: trackerColor(item.color), color: "oklch(0.16 0.02 264)" }
                          : { color: trackerColor(item.color), background: `color-mix(in oklch, ${trackerColor(item.color)} 14%, transparent)`, border: `1px solid color-mix(in oklch, ${trackerColor(item.color)} 26%, transparent)` }
                      }
                    >
                      {item.done ? <Check className="h-4 w-4" strokeWidth={3} /> : trackerInitial(item.name)}
                    </span>
                    <span className={cn("flex-1 text-sm font-medium", item.done && "text-muted-foreground line-through decoration-1")}>{item.name}</span>
                    {item.streak > 1 && (
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground numeral">
                        <Flame className="h-3.5 w-3.5" style={{ color: trackerColor(item.color) }} />
                        {item.streak}
                      </span>
                    )}
                    {item.done && item.score != null && <span className="text-xs text-muted-foreground numeral">{item.score}</span>}
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No daily trackers yet. <Link href="/trackers" className="text-primary">Create one</Link>.</p>
          )}
        </BentoCard>

        {/* Life score */}
        <BentoCard href="/dashboard" className="flex flex-col items-center justify-center text-center" delay={0.06}>
          <ScoreRing value={overview?.composite ?? 0} color="var(--primary)" size={104}>
            <div>
              <div className="text-2xl font-bold numeral leading-none">{overview?.hasScored ? overview.credit : "-"}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Life score</div>
            </div>
          </ScoreRing>
          <p className="text-xs text-muted-foreground mt-3">{overview?.hasScored ? scoreLabel(overview.composite) : "Start logging"}</p>
        </BentoCard>

        {/* Morning brief */}
        <BentoCard className="flex flex-col justify-between min-h-[140px]" delay={0.1}>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Morning brief</span>
          <p className="text-sm font-medium leading-snug mt-2">
            {brief?.content ?? "Your AI brief lands here at 8am - a focused nudge for the day ahead."}
          </p>
        </BentoCard>
      </div>

      {/* Tracker mini-scores */}
      {trackers.length > 0 && (
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
          {trackers.slice(0, 6).map((t: any, i: number) => (
            <BentoCard key={t._id} href={`/trackers/${t._id}`} className="!p-3.5 flex flex-col gap-2" delay={0.04 * i}>
              <div className="flex items-center justify-between">
                <TrackerMark name={t.name} color={t.color} size={30} />
                {t.streak > 1 && (
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground numeral">
                    <Flame className="h-3 w-3" style={{ color: trackerColor(t.color) }} />
                    {t.streak}
                  </span>
                )}
              </div>
              <div>
                <div className="text-lg font-bold numeral leading-none">{t.needsData ? "-" : t.score}</div>
                <div className="text-[10px] text-muted-foreground mt-1 leading-tight truncate">{t.name}</div>
              </div>
            </BentoCard>
          ))}
        </div>
      )}

      {/* Rituals quick-toggle */}
      {rituals.length > 0 && (
        <BentoCard delay={0.12}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Daily rituals</h2>
            <Link href="/rituals" className="text-xs text-muted-foreground hover:text-foreground">Manage</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {(rituals as any[]).map((r) => {
              const done = completedIds.includes(r._id);
              return (
                <button
                  key={r._id}
                  onClick={() => convexUserId && toggleRitual({ userId: convexUserId, date: today, ritualId: r._id })}
                  className={cn("flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors", done ? "border-transparent text-foreground" : "border-border text-muted-foreground hover:text-foreground")}
                  style={done ? { background: "color-mix(in oklch, var(--primary) 22%, transparent)" } : undefined}
                >
                  {r.title}
                </button>
              );
            })}
          </div>
        </BentoCard>
      )}
    </div>
  );
}
