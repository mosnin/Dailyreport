"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";
import { fadeUp, listVariants, itemVariants } from "@/lib/motion";
import { Users, Target, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

function AlignmentBar({ pct }: { pct: number }) {
  const fillClass =
    pct > 60
      ? "bg-emerald-500"
      : pct >= 30
      ? "bg-amber-400"
      : "bg-muted-foreground/30";

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", fillClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0">
        {pct}%
      </span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2.5 w-full" />
            </div>
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function PeoplePage() {
  const { convexUserId } = useConvexUser();
  const data = useQuery(
    api.reports.getPeopleInsights,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  const isLoading = data === undefined;
  const isEmpty = data !== null && data !== undefined && data.allPeople.length === 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <motion.div {...fadeUp(0)}>
        <h1 className="text-2xl font-heading font-bold tracking-tight">People</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your connection patterns across all reports
        </p>
      </motion.div>

      {isLoading && (
        <motion.div {...fadeUp(0.05)}>
          <LoadingSkeleton />
        </motion.div>
      )}

      {!isLoading && data && (
        <>
          <motion.div
            {...fadeUp(0.05)}
            className="flex flex-wrap gap-3"
          >
            <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-card px-4 py-3 flex-1 min-w-[140px]">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-xl font-bold tabular-nums leading-none">
                  {data.uniqueThisMonth}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">unique this month</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-border/50 bg-card px-4 py-3 flex-1 min-w-[140px]">
              <Target className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-xl font-bold tabular-nums leading-none">
                  {data.totalUnique}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">total connections</p>
              </div>
            </div>
          </motion.div>

          {data.allPeople.length > 0 && (
            <motion.section {...fadeUp(0.1)}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Top Connections
              </h2>
              <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
                <motion.ul
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                  className="divide-y divide-border/40"
                >
                  {data.allPeople.slice(0, 10).map((person) => (
                    <motion.li
                      key={person.name.toLowerCase()}
                      variants={itemVariants}
                      className="flex items-center gap-4 px-4 py-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 uppercase">
                        {person.name.trim()[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold font-heading truncate">
                          {person.name}
                        </p>
                        <AlignmentBar pct={person.goalAlignmentPct} />
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-0.5">
                        <span className="text-xs font-bold tabular-nums bg-muted/60 rounded-full px-2 py-0.5">
                          {person.count}×
                        </span>
                        <span className="text-[10px] text-muted-foreground leading-none">
                          goal-aligned
                        </span>
                      </div>
                    </motion.li>
                  ))}
                </motion.ul>
              </div>
            </motion.section>
          )}

          {data.recentPeople.length > 0 && (
            <motion.section {...fadeUp(0.15)}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Last 7 Days
              </h2>
              <div className="rounded-2xl border border-border/50 bg-muted/30 overflow-hidden">
                <motion.ul
                  variants={listVariants}
                  initial="hidden"
                  animate="visible"
                  className="divide-y divide-border/40"
                >
                  {data.recentPeople.map((entry, i) => (
                    <motion.li
                      key={`${entry.name}-${entry.date}-${i}`}
                      variants={itemVariants}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <span className="text-sm font-medium flex-1 truncate">{entry.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                        {format(parseISO(entry.date), "MMM d")}
                      </span>
                      {entry.goalRelated === true && (
                        <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full px-2 py-0.5 shrink-0">
                          goal
                        </span>
                      )}
                    </motion.li>
                  ))}
                </motion.ul>
              </div>
            </motion.section>
          )}

          {isEmpty && (
            <motion.div
              {...fadeUp(0.1)}
              className="rounded-2xl border border-border/50 bg-muted/30 flex flex-col items-center justify-center py-16 px-6 text-center"
            >
              <Users className="w-10 h-10 text-muted-foreground/40 mb-4" />
              <p className="text-sm font-medium">No connections logged yet</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Start filling in the "People met today" field in your daily reports to see your connection patterns here.
              </p>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
