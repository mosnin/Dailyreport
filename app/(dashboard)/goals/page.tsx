"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { GoalSection } from "@/components/goals/GoalSection";
import { Skeleton } from "@/components/ui/skeleton";
import { type GoalCategory, periodLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

const CATEGORIES: GoalCategory[] = ["lifelong", "yearly", "quarterly", "monthly", "weekly"];

const CATEGORY_META: Record<GoalCategory, { label: string; color: string; dot: string }> = {
  lifelong: { label: "Life", color: "text-purple-500", dot: "bg-purple-500" },
  yearly: { label: "Year", color: "text-blue-500", dot: "bg-blue-500" },
  quarterly: { label: "Quarter", color: "text-indigo-500", dot: "bg-indigo-500" },
  monthly: { label: "Month", color: "text-teal-500", dot: "bg-teal-500" },
  weekly: { label: "Week", color: "text-green-500", dot: "bg-green-500" },
};

export default function GoalsPage() {
  const { convexUserId, isLoading } = useConvexUser();
  const summary = useQuery(
    api.goals.getCurrentSummary,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  if (isLoading || !convexUserId) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-20 w-full" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Goals</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track what matters across every time horizon.
        </p>
      </div>

      {/* Overview strip */}
      <div className="grid grid-cols-5 gap-2">
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          const data = summary?.[cat];
          const total = data?.total ?? 0;
          const completed = data?.completed ?? 0;
          const pct = total > 0 ? Math.round((completed / total) * 100) : null;
          const pk = data?.periodKey ?? "";

          return (
            <div
              key={cat}
              className="rounded-xl border border-border bg-card p-2.5 flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full shrink-0", meta.dot)} />
                <span className="text-xs font-medium truncate">{meta.label}</span>
              </div>
              <div className="text-lg font-bold leading-none">
                {summary === undefined ? (
                  <span className="text-muted-foreground text-sm">…</span>
                ) : total === 0 ? (
                  <span className="text-muted-foreground text-sm">—</span>
                ) : (
                  <span className={pct === 100 ? "text-green-500" : undefined}>
                    {pct}%
                  </span>
                )}
              </div>
              {total > 0 && (
                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", meta.dot)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
              {pk && (
                <p className="text-[10px] text-muted-foreground/70 truncate leading-tight">
                  {cat === "lifelong" ? "All time" : periodLabel(cat, pk)}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Full sections with period navigation */}
      <div className="space-y-4">
        {CATEGORIES.map((category) => (
          <GoalSection key={category} userId={convexUserId} category={category} />
        ))}
      </div>
    </div>
  );
}
