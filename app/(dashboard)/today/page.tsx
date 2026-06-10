"use client";

import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { fadeUp } from "@/lib/motion";
import {
  Sparkles,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Circle,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";

function greet(firstName: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${firstName}.`;
  if (h < 17) return `Good afternoon, ${firstName}.`;
  return `Good evening, ${firstName}.`;
}

function todayLabel(): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

export default function TodayPage() {
  const { convexUserId, convexUser, isLoading } = useConvexUser();
  const { user } = useUser();
  const firstName = user?.firstName ?? user?.fullName?.split(" ")[0] ?? "there";
  const today = todayIso();

  const brief = useQuery(
    api.aiInternal.getDailyBriefPublic,
    convexUserId ? { userId: convexUserId, date: today } : "skip"
  );

  const recentReports = useQuery(
    api.reports.getRecentReports,
    convexUserId ? { userId: convexUserId, limit: 2 } : "skip"
  );

  const goalSummary = useQuery(
    api.goals.getCurrentSummary,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  const rituals = useQuery(
    api.rituals.list,
    convexUserId ? { userId: convexUserId } : "skip"
  ) ?? [];

  const ritualLog = useQuery(
    api.rituals.getLog,
    convexUserId ? { userId: convexUserId, date: today } : "skip"
  );

  // @ts-ignore
  const integrations = useQuery(
    api.integrations.getUserIntegrations as any,
    convexUserId ? { userId: convexUserId } : "skip"
  ) ?? [];
  const hasCalendar = (integrations as any[]).some((i: any) => i.platform === "googlecalendar");

  const fetchCalendarEvents = useAction(api.ai.fetchCalendarEvents);
  const [calendarEvents, setCalendarEvents] = useState<{ title: string; time: string }[] | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);

  useEffect(() => {
    if (!convexUserId || !hasCalendar || calendarEvents !== null) return;
    setCalendarLoading(true);
    fetchCalendarEvents({ userId: convexUserId, date: today })
      .then((events) => setCalendarEvents(events))
      .catch(() => setCalendarEvents([]))
      .finally(() => setCalendarLoading(false));
  }, [convexUserId, hasCalendar]);

  // Yesterday's committed plan — most recent daily report's tomorrowPlan
  const yesterdayPlan = (recentReports as any)?.[0]?.responses
    ? ((recentReports as any)[0].responses as Record<string, unknown>)?.tomorrowPlan
    : null;
  const yesterdayPlanStr =
    typeof yesterdayPlan === "string" && yesterdayPlan.trim()
      ? yesterdayPlan.trim()
      : null;

  // Goals needing attention
  const goalsAtRisk = goalSummary
    ? (Object.entries(goalSummary) as [string, any][]).filter(
        ([, v]) => v.total > 0 && v.completed < v.total
      )
    : [];

  // Ritual progress
  const completedIds: string[] = ritualLog?.completedIds ?? [];
  const totalRituals = (rituals as any[]).length;
  const completedRituals = (rituals as any[]).filter((r: any) =>
    completedIds.includes(r._id)
  ).length;
  const allRitualsDone = totalRituals > 0 && completedRituals === totalRituals;

  const onboardingComplete = (convexUser as any)?.onboardingComplete;

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-xl space-y-5">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6 pb-8">

      {/* Date + greeting */}
      <motion.div {...fadeUp(0)}>
        <p className="text-xs text-muted-foreground font-medium tracking-wide mb-1 select-none">
          {todayLabel()}
        </p>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">
          {greet(firstName)}
        </h1>
      </motion.div>

      {/* Morning brief */}
      {brief ? (
        <motion.div
          {...fadeUp(0.06)}
          className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-primary/60" />
            <span className="text-[11px] font-semibold text-primary/60 uppercase tracking-[0.14em]">
              Morning brief
            </span>
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed italic">{brief.content}</p>
        </motion.div>
      ) : onboardingComplete ? (
        <motion.div
          {...fadeUp(0.06)}
          className="rounded-2xl border border-border bg-card px-5 py-4"
        >
          <div className="flex items-start gap-3">
            <ClipboardList className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Your morning brief generates at 8am each day.
            </p>
          </div>
        </motion.div>
      ) : null}

      {/* Today's schedule — Google Calendar */}
      {(hasCalendar || calendarLoading) && (
        <motion.div {...fadeUp(0.12)} className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em]">
            Today&apos;s schedule
          </h2>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {calendarLoading ? (
              <div className="px-5 py-3.5 text-sm text-muted-foreground">Loading…</div>
            ) : calendarEvents && calendarEvents.length > 0 ? (
              calendarEvents.map((event, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                  <span className="text-sm flex-1 min-w-0 truncate">{event.title}</span>
                  <span className="text-xs text-muted-foreground/60 shrink-0">{event.time}</span>
                </div>
              ))
            ) : (
              <div className="px-5 py-3.5 text-sm text-muted-foreground">No events today.</div>
            )}
          </div>
        </motion.div>
      )}

      {/* Yesterday's committed plan */}
      {yesterdayPlanStr && (
        <motion.div {...fadeUp(0.18)} className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em]">
            You planned for today
          </h2>
          <div className="rounded-2xl border border-border bg-card px-5 py-4">
            <p className="text-sm text-foreground/80 leading-relaxed">&ldquo;{yesterdayPlanStr}&rdquo;</p>
          </div>
        </motion.div>
      )}

      {/* Ritual progress */}
      {totalRituals > 0 && (
        <motion.div {...fadeUp(0.24)} className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em]">
              Daily rituals
            </h2>
            <Link
              href="/rituals"
              className="text-[11px] text-muted-foreground/50 hover:text-primary transition-colors"
            >
              {completedRituals}/{totalRituals}{allRitualsDone && " ✓"}
            </Link>
          </div>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {(rituals as any[]).slice(0, 6).map((ritual: any) => {
              const done = completedIds.includes(ritual._id);
              return (
                <div key={ritual._id} className="flex items-center gap-3 px-5 py-3">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground/25 shrink-0" />
                  )}
                  <span className={cn("text-sm", done && "text-muted-foreground/60")}>
                    {ritual.title}
                  </span>
                </div>
              );
            })}
          </div>
          {totalRituals > 6 && (
            <Link href="/rituals" className="block text-center text-xs text-muted-foreground/50 hover:text-primary transition-colors">
              +{totalRituals - 6} more →
            </Link>
          )}
        </motion.div>
      )}

      {/* Goals needing attention */}
      {goalsAtRisk.length > 0 && (
        <motion.div {...fadeUp(0.30)} className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em]">
            Goals needing attention
          </h2>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {goalsAtRisk.map(([category, stats]: [string, any]) => (
              <Link
                key={category}
                href="/goals"
                className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize">{category} goals</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stats.completed} of {stats.total} complete
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {Array.from({ length: Math.min(stats.total, 8) }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        i < stats.completed ? "bg-emerald-400" : "bg-border"
                      )}
                    />
                  ))}
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              </Link>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {!brief && !yesterdayPlanStr && totalRituals === 0 && goalsAtRisk.length === 0 && (
        <motion.div {...fadeUp(0.36)} className="rounded-2xl border border-border bg-card px-5 py-6 text-center space-y-3">
          <p className="text-sm font-medium">Your command center is empty.</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Fill in a daily report, add some goals and rituals — then this page
            becomes your accountability hub.
          </p>
          <Link
            href="/reports/daily"
            className="inline-block text-xs font-medium text-primary hover:text-primary/80 transition-colors mt-1"
          >
            Start today&apos;s report →
          </Link>
        </motion.div>
      )}

    </div>
  );
}
