"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useTodayStatus } from "@/hooks/useTodayStatus";
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
import { Bell, ArrowRight, Flame } from "lucide-react";
import { useUser } from "@clerk/nextjs";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { convexUserId, convexUser, isLoading } = useConvexUser();
  const { user } = useUser();
  const [showTzModal, setShowTzModal] = useState(false);
  const { subscribe, subscribed } = usePushSubscription(convexUserId);
  const { streak } = useTodayStatus(convexUserId);

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

  const firstName = user?.firstName ?? null;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Greeting header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/50 mb-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            {greeting()}{firstName ? `, ${firstName}` : ""}
          </h1>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-sm font-medium text-orange-500">{streak} day streak</span>
            </div>
          )}
        </div>
      </div>

      {/* Daily report CTA — prominent when not yet done */}
      {todayReport === null && (
        <Link
          href="/reports/daily"
          className="group flex items-center justify-between rounded-2xl border border-dashed border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/30 px-6 py-5 transition-all"
        >
          <div>
            <p className="font-semibold text-base">Write today&apos;s entry</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long" })}&apos;s report is waiting.
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
        </Link>
      )}

      {/* AI Insight — front and center */}
      <InsightCard userId={convexUserId} />

      {/* Today's practice dots */}
      <TodayPractice userId={convexUserId} />

      {/* Stats */}
      <StatsBar userId={convexUserId} />

      {/* Push prompt */}
      {!subscribed &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission !== "granted" && (
          <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-3 text-sm">
              <Bell className="w-4 h-4 text-muted-foreground/60 shrink-0" />
              <span className="text-muted-foreground/70 text-sm">
                Get reminded at 8pm every day.
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={subscribe} className="text-xs">
              Enable
            </Button>
          </div>
        )}

      {/* Charts + Calendar */}
      <ScoreChart userId={convexUserId} />
      <CalendarGrid userId={convexUserId} />

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
