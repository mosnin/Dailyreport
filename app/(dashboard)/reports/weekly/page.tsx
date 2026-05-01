"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { WeeklyReportForm } from "@/components/reports/WeeklyReportForm";
import { Skeleton } from "@/components/ui/skeleton";
import { currentWeekStartString, isSunday, nextSundayDate } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { fadeUp } from "@/lib/motion";

export default function WeeklyReportPage() {
  const { convexUserId, isLoading } = useConvexUser();

  const weekStart = currentWeekStartString();
  const existing = useQuery(
    api.reports.getWeeklyReport,
    convexUserId ? { userId: convexUserId, weekStartDate: weekStart } : "skip"
  );

  if (isLoading || !convexUserId) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!isSunday()) {
    const next = nextSundayDate();
    return (
      <div className="max-w-2xl">
        <motion.div {...fadeUp(0.08)} className="py-16 flex flex-col items-center text-center gap-5 max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
            <CalendarClock className="w-6 h-6 text-indigo-500" />
          </div>
          <div className="space-y-2">
            <p className="font-heading text-xl font-semibold">The week isn&apos;t over yet</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The weekly review opens on Sunday — a moment to close the week with intention.
              Your next window is{" "}
              <span className="font-medium text-foreground">{format(next, "EEEE, MMMM d")}</span>.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <motion.div {...fadeUp(0)} className="mb-10">
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/40 mb-1.5">
          Weekly Review
        </p>
        <h1 className="font-heading text-[2.2rem] font-semibold tracking-tight leading-[1.15]">
          {format(parseISO(weekStart + "T00:00:00"), "MMMM d")} — {format(new Date(), "MMMM d, yyyy")}
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-sm text-muted-foreground">Seven days to account for.</p>
          {existing && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
        </div>
      </motion.div>
      <WeeklyReportForm
        userId={convexUserId}
        initialResponses={existing?.responses as Record<string, unknown> | undefined}
      />
    </div>
  );
}
