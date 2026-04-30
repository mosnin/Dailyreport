"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { CalendarGrid } from "@/components/dashboard/CalendarGrid";
import { DailyReportForm } from "@/components/reports/DailyReportForm";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp } from "@/lib/motion";
import { format, parseISO, startOfWeek, endOfWeek, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Minus, NotepadText, BookOpen, Users, Target, AlertTriangle, CheckSquare, CalendarDays, Pencil, X } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

// ── Helpers ───────────────────────────────────────────────────────────────

function getMondayOfWeek(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const monday = startOfWeek(date, { weekStartsOn: 1 });
  return format(monday, "yyyy-MM-dd");
}

function getWeekRange(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const mon = startOfWeek(date, { weekStartsOn: 1 });
  const sun = endOfWeek(date, { weekStartsOn: 1 });
  if (mon.getMonth() === sun.getMonth()) {
    return `${format(mon, "MMM d")} – ${format(sun, "d, yyyy")}`;
  }
  return `${format(mon, "MMM d")} – ${format(sun, "MMM d, yyyy")}`;
}

// ── Section block ─────────────────────────────────────────────────────────

function Section({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
        <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground/50">{label}</p>
      </div>
      <div className="pl-5">{children}</div>
    </div>
  );
}

// ── Daily report viewer ───────────────────────────────────────────────────

type PersonMet = { id: string; name: string; goalRelated: boolean | null; notes: string };
type Problem = { id: string; title: string; solutions: string };

function DailyReportView({ userId, date }: { userId: Id<"users">; date: string }) {
  const report = useQuery(api.reports.getDailyReport, { userId, date });

  if (report === undefined) {
    return (
      <div className="space-y-4">
        {[80, 60, 100, 60].map((w, i) => (
          <Skeleton key={i} className={`h-4 w-${w === 100 ? "full" : `[${w}%]`}`} />
        ))}
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <NotepadText className="w-5 h-5 text-muted-foreground/40" />
        </div>
        <p className="text-sm text-muted-foreground">No daily report for this day.</p>
      </div>
    );
  }

  const r = report.responses as Record<string, unknown>;
  const dayActivity = typeof r.dayActivity === "string" ? r.dayActivity : "";
  const emotionalDrain = typeof r.emotionalDrain === "string" ? r.emotionalDrain : "";
  const tomorrowPlan = typeof r.tomorrowPlan === "string" ? r.tomorrowPlan : "";
  const dailyGoals = Array.isArray(r.dailyGoals) ? (r.dailyGoals as string[]) : [];
  const peopleMetToday = Array.isArray(r.peopleMetToday) ? (r.peopleMetToday as PersonMet[]) : [];
  const problemsToSolve = Array.isArray(r.problemsToSolve) ? (r.problemsToSolve as Problem[]) : [];
  const problemsSolvedToday = Array.isArray(r.problemsSolvedToday) ? (r.problemsSolvedToday as string[]) : [];
  const didAffirmations = typeof r.didAffirmations === "boolean" ? r.didAffirmations : null;

  const hasContent = dayActivity || emotionalDrain || tomorrowPlan || dailyGoals.length || peopleMetToday.length || problemsToSolve.length || problemsSolvedToday.length || didAffirmations !== null;

  if (!hasContent) {
    return <p className="text-sm text-muted-foreground italic">Report submitted but no content recorded.</p>;
  }

  return (
    <div className="space-y-6">
      {dayActivity && (
        <Section icon={NotepadText} label="How the day went">
          <p className="text-sm leading-relaxed text-foreground">{dayActivity}</p>
        </Section>
      )}

      {dailyGoals.length > 0 && (
        <Section icon={Target} label="Goals for the day">
          <ul className="space-y-1">
            {dailyGoals.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mt-2 shrink-0" />
                {g}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {emotionalDrain && (
        <Section icon={Minus} label="Emotional check-in">
          <p className="text-sm leading-relaxed text-foreground">{emotionalDrain}</p>
        </Section>
      )}

      {peopleMetToday.length > 0 && (
        <Section icon={Users} label="People connected with">
          <div className="space-y-2">
            {peopleMetToday.map((p) => (
              <div key={p.id} className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{p.name}</span>
                  {p.goalRelated === true && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">goal-related</span>
                  )}
                </div>
                {p.notes && <p className="text-xs text-muted-foreground leading-snug">{p.notes}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {problemsToSolve.length > 0 && (
        <Section icon={AlertTriangle} label="Problems & solutions">
          <div className="space-y-3">
            {problemsToSolve.map((p) => (
              <div key={p.id}>
                <p className="text-sm font-medium">{p.title}</p>
                {p.solutions && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{p.solutions}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {problemsSolvedToday.length > 0 && (
        <Section icon={CheckSquare} label="Problems solved today">
          <ul className="space-y-1">
            {problemsSolvedToday.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {tomorrowPlan && (
        <Section icon={CalendarDays} label="Tomorrow's plan">
          <p className="text-sm leading-relaxed text-foreground">{tomorrowPlan}</p>
        </Section>
      )}

      {didAffirmations !== null && (
        <Section icon={CheckCircle2} label="Affirmations">
          <div className="flex items-center gap-1.5">
            {didAffirmations ? (
              <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Done</span></>
            ) : (
              <><XCircle className="w-4 h-4 text-muted-foreground/40" /><span className="text-sm text-muted-foreground">Skipped</span></>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Weekly report viewer ──────────────────────────────────────────────────

function WeeklyReportView({ userId, weekStartDate }: { userId: Id<"users">; weekStartDate: string }) {
  const report = useQuery(api.reports.getWeeklyReport, { userId, weekStartDate });

  if (report === undefined) {
    return (
      <div className="space-y-4">
        {[80, 60, 100, 60].map((w, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-muted-foreground/40" />
        </div>
        <p className="text-sm text-muted-foreground">No weekly review for this week.</p>
      </div>
    );
  }

  const r = report.responses as Record<string, unknown>;
  const weekActivity = typeof r.weekActivity === "string" ? r.weekActivity : "";
  const emotionalDrain = typeof r.emotionalDrain === "string" ? r.emotionalDrain : "";
  const nextWeekPlan = typeof r.nextWeekPlan === "string" ? r.nextWeekPlan : "";
  const weeklyGoals = Array.isArray(r.weeklyGoals) ? (r.weeklyGoals as string[]) : [];
  const peopleMetThisWeek = Array.isArray(r.peopleMetThisWeek) ? (r.peopleMetThisWeek as PersonMet[]) : [];
  const problemsToSolve = Array.isArray(r.problemsToSolve) ? (r.problemsToSolve as Problem[]) : [];
  const problemsSolvedThisWeek = Array.isArray(r.problemsSolvedThisWeek) ? (r.problemsSolvedThisWeek as string[]) : [];
  const didAffirmations = typeof r.didAffirmations === "boolean" ? r.didAffirmations : null;

  const hasContent = weekActivity || emotionalDrain || nextWeekPlan || weeklyGoals.length || peopleMetThisWeek.length || problemsToSolve.length || problemsSolvedThisWeek.length || didAffirmations !== null;

  if (!hasContent) {
    return <p className="text-sm text-muted-foreground italic">Review submitted but no content recorded.</p>;
  }

  return (
    <div className="space-y-6">
      {weekActivity && (
        <Section icon={BookOpen} label="How the week went">
          <p className="text-sm leading-relaxed text-foreground">{weekActivity}</p>
        </Section>
      )}

      {weeklyGoals.length > 0 && (
        <Section icon={Target} label="Goals for the week">
          <ul className="space-y-1">
            {weeklyGoals.map((g, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mt-2 shrink-0" />
                {g}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {emotionalDrain && (
        <Section icon={Minus} label="Emotional check-in">
          <p className="text-sm leading-relaxed text-foreground">{emotionalDrain}</p>
        </Section>
      )}

      {peopleMetThisWeek.length > 0 && (
        <Section icon={Users} label="People connected with">
          <div className="space-y-2">
            {peopleMetThisWeek.map((p) => (
              <div key={p.id} className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{p.name}</span>
                  {p.goalRelated === true && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">goal-related</span>
                  )}
                </div>
                {p.notes && <p className="text-xs text-muted-foreground leading-snug">{p.notes}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {problemsToSolve.length > 0 && (
        <Section icon={AlertTriangle} label="Problems & solutions">
          <div className="space-y-3">
            {problemsToSolve.map((p) => (
              <div key={p.id}>
                <p className="text-sm font-medium">{p.title}</p>
                {p.solutions && <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{p.solutions}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {problemsSolvedThisWeek.length > 0 && (
        <Section icon={CheckSquare} label="Problems solved this week">
          <ul className="space-y-1">
            {problemsSolvedThisWeek.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {nextWeekPlan && (
        <Section icon={CalendarDays} label="Next week's plan">
          <p className="text-sm leading-relaxed text-foreground">{nextWeekPlan}</p>
        </Section>
      )}

      {didAffirmations !== null && (
        <Section icon={CheckCircle2} label="Affirmations">
          <div className="flex items-center gap-1.5">
            {didAffirmations ? (
              <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Done</span></>
            ) : (
              <><XCircle className="w-4 h-4 text-muted-foreground/40" /><span className="text-sm text-muted-foreground">Skipped</span></>
            )}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Report panel (tabs + viewer) ──────────────────────────────────────────

function ReportPanel({ userId, date, isEditable }: { userId: Id<"users">; date: string; isEditable: boolean }) {
  const [tab, setTab] = useState<"daily" | "weekly">("daily");
  const [editing, setEditing] = useState(false);
  const weekStartDate = getMondayOfWeek(date);
  const weekRange = getWeekRange(date);

  const existingReport = useQuery(
    api.reports.getDailyReport,
    isEditable ? { userId, date } : "skip"
  );

  return (
    <motion.div
      key={date}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      {/* Date header */}
      <div className="px-5 pt-5 pb-4 border-b border-border/50 flex items-start justify-between gap-3">
        <div>
          <p className="font-heading text-lg font-semibold leading-tight">
            {format(parseISO(date), "EEEE, MMMM d")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Week of {weekRange}
          </p>
        </div>
        {isEditable && tab === "daily" && !editing && existingReport && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        )}
        {editing && (
          <button
            onClick={() => setEditing(false)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
        )}
      </div>

      {/* Tabs — hidden when editing */}
      {!editing && (
        <div className="flex border-b border-border/50">
          {(["daily", "weekly"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold transition-colors relative",
                tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "daily" ? <NotepadText className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
              {t === "daily" ? "Daily Report" : "Weekly Review"}
              {tab === t && (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", damping: 28, stiffness: 280 }}
                />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className={cn("overflow-y-auto", editing ? "p-5" : "p-5 max-h-[calc(100vh-22rem)]")}>
        <AnimatePresence mode="wait">
          {editing ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <DailyReportForm
                userId={userId}
                date={date}
                initialResponses={existingReport?.responses as Record<string, unknown> | undefined}
                onSuccess={() => setEditing(false)}
              />
            </motion.div>
          ) : (
            <motion.div
              key={tab + date}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {tab === "daily" ? (
                <DailyReportView userId={userId} date={date} />
              ) : (
                <WeeklyReportView userId={userId} weekStartDate={weekStartDate} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { convexUserId, isLoading } = useConvexUser();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-5xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <motion.div {...fadeUp(0)}>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Select any past day to read your daily report and weekly review.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* Calendar */}
        <motion.div {...fadeUp(0.08)}>
          <CalendarGrid
            userId={convexUserId}
            clickable
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
          />
        </motion.div>

        {/* Report viewer */}
        <motion.div {...fadeUp(0.14)} className="min-h-[300px]">
          <AnimatePresence mode="wait">
            {selectedDate ? (
              <ReportPanel key={selectedDate} userId={convexUserId} date={selectedDate} isEditable={selectedDate === yesterdayStr} />
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center h-full min-h-[280px] rounded-xl border border-dashed border-border/50 text-center gap-3 px-6"
              >
                <CalendarDays className="w-8 h-8 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground/50">
                  Select a day on the calendar to read your reports.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
