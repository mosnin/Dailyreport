"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { WeeklyReportForm } from "@/components/reports/WeeklyReportForm";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { currentWeekStartString, formatDateLabel, isSunday, nextSundayDate } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarClock } from "lucide-react";
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
      <div className="max-w-2xl space-y-6">
        <motion.div {...fadeUp(0)}>
          <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">Weekly Report</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Reflect on the week that just finished — opens every Sunday.
          </p>
        </motion.div>
        <motion.div {...fadeUp(0.08)}>
          <Card>
            <CardContent className="py-10 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <CalendarClock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold">Come back Sunday</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                The weekly report covers the full week, so it only opens on Sundays.
                Your next reflection window is{" "}
                <span className="font-medium text-foreground">
                  {format(next, "EEEE, MMMM d")}
                </span>
                .
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <motion.div {...fadeUp(0)}>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">Weekly Report</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Week of {formatDateLabel(weekStart)}
        </p>
        {existing && (
          <p className="text-sm text-green-600 font-medium mt-1">
            Already submitted — you can update your answers below.
          </p>
        )}
      </motion.div>
      <motion.div {...fadeUp(0.08)}>
        <WeeklyReportForm
          userId={convexUserId}
          initialResponses={existing?.responses as Record<string, unknown> | undefined}
        />
      </motion.div>
    </div>
  );
}
