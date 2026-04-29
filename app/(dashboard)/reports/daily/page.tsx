"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { DailyReportForm } from "@/components/reports/DailyReportForm";
import { Skeleton } from "@/components/ui/skeleton";
import { todayString, formatDateLabel } from "@/lib/utils";

export default function DailyReportPage() {
  const { convexUserId, isLoading } = useConvexUser();

  const today = todayString();
  const existing = useQuery(
    api.reports.getDailyReport,
    convexUserId ? { userId: convexUserId, date: today } : "skip"
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
        <h1 className="text-2xl font-bold">Daily Report</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{formatDateLabel(today)}</p>
        {existing && (
          <p className="text-sm text-green-600 font-medium mt-1">
            ✓ Already submitted — you can update your answers below.
          </p>
        )}
      </div>
      <DailyReportForm
        userId={convexUserId}
        initialResponses={existing?.responses as Record<string, unknown> | undefined}
      />
    </div>
  );
}
