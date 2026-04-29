"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { CalendarGrid } from "@/components/dashboard/CalendarGrid";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { TimezoneModal } from "@/components/dashboard/TimezoneModal";
import { TodayPractice } from "@/components/dashboard/TodayPractice";
import { ScoreChart } from "@/components/dashboard/ScoreChart";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { todayString } from "@/lib/utils";
import { Bell } from "lucide-react";

export default function DashboardPage() {
  const { convexUserId, convexUser, isLoading } = useConvexUser();
  const [showTzModal, setShowTzModal] = useState(false);
  const { subscribe, subscribed } = usePushSubscription(convexUserId);

  const todayReport = useQuery(
    api.reports.getDailyReport,
    convexUserId ? { userId: convexUserId, date: todayString() } : "skip"
  );

  useEffect(() => {
    if (convexUser && !convexUser.timezone) {
      setShowTzModal(true);
    }
  }, [convexUser]);

  if (isLoading || !convexUserId) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        {todayReport === null && (
          <Link
            href="/reports/daily"
            className="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Fill today&apos;s report
          </Link>
        )}
        {todayReport && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            ✓ Report submitted
          </span>
        )}
      </div>

      <StatsBar userId={convexUserId} />

      {/* Today's practice tracking */}
      <TodayPractice userId={convexUserId} />

      {/* Push notification prompt */}
      {!subscribed &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission !== "granted" && (
          <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3 text-sm">
              <Bell className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">
                Enable push notifications for your 8pm daily reminders.
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={subscribe}>
              Enable
            </Button>
          </div>
        )}

      <ScoreChart userId={convexUserId} />

      {/* Calendar + Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CalendarGrid userId={convexUserId} />
        <InsightCard userId={convexUserId} />
      </div>

      {convexUserId && (
        <TimezoneModal
          userId={convexUserId}
          open={showTzModal}
          onClose={() => setShowTzModal(false)}
        />
      )}
    </div>
  );
}
