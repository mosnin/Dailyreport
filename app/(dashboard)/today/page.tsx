"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { fadeUp } from "@/lib/motion";
import { ArrowUpRight } from "lucide-react";

function greet(firstName: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${firstName}.`;
  if (h < 17) return `Good afternoon, ${firstName}.`;
  return `Good evening, ${firstName}.`;
}

function todayLabel(): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export default function TodayPage() {
  const { convexUserId, isLoading } = useConvexUser();
  const { user } = useUser();

  const goalSummary = useQuery(
    api.goals.getCurrentSummary,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  const goalsAtRisk = goalSummary
    ? (Object.entries(goalSummary) as [string, any][]).filter(
        ([, v]) => v.total > 0 && v.completed < v.total
      )
    : [];

  const firstName = user?.firstName ?? user?.fullName?.split(" ")[0] ?? "there";

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-2xl space-y-5">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 pb-8">
      {/* Date + greeting */}
      <motion.div {...fadeUp(0)}>
        <p className="text-xs text-muted-foreground font-medium tracking-wide mb-1 select-none">
          {todayLabel()}
        </p>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">
          {greet(firstName)}
        </h1>
      </motion.div>

      {/* Goals at risk */}
      {goalsAtRisk.length > 0 && (
        <motion.div {...fadeUp(1)} className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em]">
            Goals needing attention
          </h2>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {goalsAtRisk.map(([category, stats]: [string, any]) => (
              <div key={category} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize">{category} goals</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stats.completed} of {stats.total} complete
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {Array.from({ length: Math.min(stats.total, 8) }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        i < stats.completed ? "bg-emerald-400" : "bg-border"
                      )}
                    />
                  ))}
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
