"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { todayString } from "@/lib/utils";

const AFFIRMATION_GOAL = 5;

export function useTodayStatus(userId: Id<"users"> | null) {
  const todayStr = todayString();

  const session = useQuery(
    api.affirmations.getTodaySession,
    userId ? { userId, date: todayStr } : "skip"
  );
  const viz = useQuery(
    api.visualizations.getForDate,
    userId ? { userId, date: todayStr } : "skip"
  );
  const todayReport = useQuery(
    api.reports.getDailyReport,
    userId ? { userId, date: todayStr } : "skip"
  );
  const stats = useQuery(
    api.users.getStats,
    userId ? { userId } : "skip"
  );

  const rounds = session?.rounds ?? 0;
  const vizCompleted = viz?.completedIndexes?.length ?? 0;
  const vizTotal = viz?.scenarios?.length ?? 0;

  const reportDone = todayReport != null;
  const affirmDone = rounds >= AFFIRMATION_GOAL;
  const vizDone = vizCompleted > 0 && vizCompleted >= vizTotal;
  const totalDone = (reportDone ? 1 : 0) + (affirmDone ? 1 : 0) + (vizDone ? 1 : 0);
  const streak = stats?.streak ?? 0;

  return {
    reportDone,
    affirmDone,
    vizDone,
    totalDone,
    streak,
    rounds,
    vizCompleted,
    vizTotal: vizTotal || 10,
  };
}
