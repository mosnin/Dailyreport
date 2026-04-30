"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { GoalSection } from "@/components/goals/GoalSection";
import { Skeleton } from "@/components/ui/skeleton";
import { type GoalCategory, periodLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { fadeUp, listVariants, itemVariants } from "@/lib/motion";

const CATEGORIES: GoalCategory[] = ["yearly", "quarterly", "monthly", "weekly"];

const CATEGORY_META: Record<GoalCategory, { label: string; color: string; dot: string }> = {
  yearly:    { label: "Year",    color: "text-chart-1", dot: "bg-chart-1" },
  quarterly: { label: "Quarter", color: "text-chart-2", dot: "bg-chart-2" },
  monthly:   { label: "Month",   color: "text-chart-3", dot: "bg-chart-3" },
  weekly:    { label: "Week",    color: "text-chart-4", dot: "bg-chart-4" },
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
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <motion.div {...fadeUp(0)}>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">Goals</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track what you&apos;re working toward across every time horizon.
        </p>
      </motion.div>

      {/* Overview strip */}
      <motion.div
        className="grid grid-cols-4 gap-2"
        initial="hidden"
        animate="visible"
        variants={listVariants}
      >
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          const data = summary?.[cat];
          const total = data?.total ?? 0;
          const completed = data?.completed ?? 0;
          const pct = total > 0 ? Math.round((completed / total) * 100) : null;
          const pk = data?.periodKey ?? "";

          return (
            <motion.div
              key={cat}
              variants={itemVariants}
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
                  {periodLabel(cat, pk)}
                </p>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* Full sections with period navigation */}
      <motion.div
        className="space-y-4"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } },
        }}
      >
        {CATEGORIES.map((category) => (
          <motion.div key={category} variants={itemVariants}>
            <GoalSection userId={convexUserId} category={category} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
