"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { WeeklyReportForm } from "@/components/reports/WeeklyReportForm";
import { Skeleton } from "@/components/ui/skeleton";
import { currentWeekStartString, formatDateLabel } from "@/lib/utils";

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

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Weekly Report</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Week of {formatDateLabel(weekStart)}
        </p>
        {existing && (
          <p className="text-sm text-green-600 font-medium mt-1">
            ✓ Already submitted — you can update your answers below.
          </p>
        )}
      </div>
      <WeeklyReportForm
        userId={convexUserId}
        initialResponses={existing?.responses as Record<string, unknown> | undefined}
      />
    </div>
  );
}
