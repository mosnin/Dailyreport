"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";
import { fadeUp, listVariants, itemVariants } from "@/lib/motion";
import { Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import Link from "next/link";

function EmptyState({ icon: Icon, headline, body, cta }: {
  icon: React.ElementType;
  headline: string;
  body: string;
  cta?: { label: string; href?: string };
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="py-16 flex flex-col items-center text-center gap-4"
    >
      <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
        <Icon className="w-6 h-6 text-muted-foreground/50" />
      </div>
      <div className="space-y-1.5 max-w-xs">
        <p className="font-semibold text-foreground">{headline}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
      {cta?.href && (
        <Link href={cta.href} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors mt-1">
          {cta.label} →
        </Link>
      )}
    </motion.div>
  );
}

function AlignmentBar({ pct }: { pct: number }) {
  const fill = pct > 60 ? "bg-emerald-500" : pct >= 30 ? "bg-amber-400" : "bg-muted-foreground/25";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", fill)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums w-8 text-right shrink-0">{pct}%</span>
    </div>
  );
}

export default function PeoplePage() {
  const { convexUserId } = useConvexUser();
  const data = useQuery(
    api.reports.getPeopleInsights,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  if (data === undefined) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <Skeleton className="h-9 w-36 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-20 flex-1 rounded-2xl" />
          <Skeleton className="h-20 flex-1 rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">

      <motion.div {...fadeUp(0)}>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">People</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your connection patterns across all reports.</p>
      </motion.div>

      {data && (
        <>
          <motion.div {...fadeUp(0.06)} className="flex gap-3">
            <div className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums leading-none">{data.uniqueThisMonth}</p>
                <p className="text-xs text-muted-foreground mt-0.5">this month</p>
              </div>
            </div>
            <div className="flex-1 rounded-2xl border border-border bg-card px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums leading-none">{data.totalUnique}</p>
                <p className="text-xs text-muted-foreground mt-0.5">total unique</p>
              </div>
            </div>
          </motion.div>

          {data.allPeople.length > 0 && (
            <motion.section {...fadeUp(0.12)}>
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/40 mb-3">
                Top Connections
              </p>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
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
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm font-medium truncate">{person.name}</p>
                        <AlignmentBar pct={person.goalAlignmentPct} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums bg-muted/50 rounded-full px-2 py-0.5 shrink-0">
                        {person.count}×
                      </span>
                    </motion.li>
                  ))}
                </motion.ul>
              </div>
            </motion.section>
          )}

          {data.recentPeople.length > 0 && (
            <motion.section {...fadeUp(0.18)}>
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/40 mb-3 flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                Last 7 Days
              </p>
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
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

          {data.allPeople.length === 0 && (
            <EmptyState
              icon={Users}
              headline="Your network starts with your first report"
              body="People you mention in daily reports appear here. Complete a few reports to see your connection patterns."
              cta={{ label: "Write today's report", href: "/reports/daily" }}
            />
          )}
        </>
      )}
    </div>
  );
}
