"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, todayString } from "@/lib/utils";
import { motion } from "motion/react";
import { BentoCard } from "@/components/bento/BentoCard";
import { ScoreRing } from "@/components/bento/ScoreRing";
import { PageHeader } from "@/components/bento/PageHeader";
import { AREAS, type AreaKey, scoreLabel } from "@/lib/areas";
import { Sparkles, Check, ChevronRight, Flame, Sun } from "lucide-react";
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

  const checklist = useQuery(api.checklist.getToday, convexUserId ? { userId: convexUserId, date: today } : "skip");
  const score = useQuery(api.lifeScore.getCurrent, convexUserId ? { userId: convexUserId, windowDays: 14 } : "skip");
  const brief = useQuery(api.aiInternal.getDailyBriefPublic, convexUserId ? { userId: convexUserId, date: today } : "skip");
  const rituals = useQuery(api.rituals.list, convexUserId ? { userId: convexUserId } : "skip") ?? [];
  const ritualLog = useQuery(api.rituals.getLog, convexUserId ? { userId: convexUserId, date: today } : "skip");
  const toggleRitual = useMutation(api.rituals.toggle);

  if (!convexUserId || checklist === undefined || score === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  const items = checklist?.items ?? [];
  const doneCount = checklist?.doneCount ?? 0;
  const total = checklist?.total ?? 0;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const completedIds: string[] = ritualLog?.completedIds ?? [];

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        eyebrow={new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}
        title={greet(firstName)}
        subtitle="Your daily checklist — knock these out to keep every area climbing."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Checklist — spans wide */}
        <BentoCard className="col-span-2 lg:col-span-2 lg:row-span-2" delay={0.02}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Today&apos;s checklist</h2>
            </div>
            <span className="text-sm font-semibold numeral text-muted-foreground">{doneCount}/{total}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-4">
            <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} />
          </div>
          <div className="space-y-1.5">
            {items.map((item: any, i: number) => {
              const meta = AREAS[item.area as AreaKey];
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors group",
                    item.done ? "bg-accent/40" : "hover:bg-accent/60"
                  )}
                >
                  <span
                    className={cn(
                      "grid place-items-center w-6 h-6 rounded-full border-2 shrink-0 transition-colors",
                      item.done ? "border-transparent" : "border-border"
                    )}
                    style={item.done ? { background: meta?.color ?? "var(--primary)" } : undefined}
                  >
                    {item.done && <Check className="w-3.5 h-3.5 text-[oklch(0.2_0.03_264)]" strokeWidth={3} />}
                  </span>
                  <span className={cn("flex-1 text-sm font-medium", item.done && "text-muted-foreground line-through decoration-1")}>
                    {item.label}
                    {item.optional && <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground/50">optional</span>}
                  </span>
                  {item.progress && (
                    <span className="text-xs text-muted-foreground numeral">{item.progress.done}/{item.progress.total}</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                </Link>
              );
            })}
          </div>
        </BentoCard>

        {/* Life score ring */}
        <BentoCard href="/dashboard" className="flex flex-col items-center justify-center text-center" delay={0.06}>
          <ScoreRing value={score?.composite ?? 0} color="var(--primary)" size={104}>
            <div>
              <div className="text-2xl font-bold numeral leading-none">{score?.credit ?? "—"}</div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Life score</div>
            </div>
          </ScoreRing>
          <p className="text-xs text-muted-foreground mt-3">{score ? scoreLabel(score.composite) : "Start logging"}</p>
        </BentoCard>

        {/* Morning brief */}
        <BentoCard tint="var(--primary)" className="flex flex-col justify-between min-h-[140px]" delay={0.1}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Morning brief</span>
          </div>
          <p className="text-sm font-medium leading-snug mt-2">
            {brief?.content ?? "Your AI brief lands here at 8am — a focused nudge for the day ahead."}
          </p>
        </BentoCard>
      </div>

      {/* Area mini-scores */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {(score?.areas ?? []).map((a: any, i: number) => {
          const meta = AREAS[a.key as AreaKey];
          const Icon = meta.icon;
          return (
            <BentoCard key={a.key} href={meta.href} className="!p-3.5 flex flex-col gap-2" delay={0.04 * i}>
              <Icon className="w-4 h-4" style={{ color: meta.color }} />
              <div>
                <div className="text-lg font-bold numeral leading-none">{a.needsData ? "—" : a.score}</div>
                <div className="text-[10px] text-muted-foreground mt-1 leading-tight">{meta.label}</div>
              </div>
            </BentoCard>
          );
        })}
      </div>

      {/* Rituals quick-toggle */}
      {rituals.length > 0 && (
        <BentoCard delay={0.12}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-execution" style={{ color: "var(--execution)" }} />
              <h2 className="font-semibold">Daily rituals</h2>
            </div>
            <Link href="/rituals" className="text-xs text-muted-foreground hover:text-foreground">Manage →</Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {(rituals as any[]).map((r) => {
              const done = completedIds.includes(r._id);
              return (
                <button
                  key={r._id}
                  onClick={() => convexUserId && toggleRitual({ userId: convexUserId, date: today, ritualId: r._id })}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium border transition-colors",
                    done ? "border-transparent bg-execution/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                  )}
                  style={done ? { background: "color-mix(in oklch, var(--execution) 18%, transparent)" } : undefined}
                >
                  <span className={cn("grid place-items-center w-4 h-4 rounded-full", done ? "" : "border border-border")} style={done ? { background: "var(--execution)" } : undefined}>
                    {done && <Check className="w-3 h-3 text-[oklch(0.2_0.03_264)]" strokeWidth={3} />}
                  </span>
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
