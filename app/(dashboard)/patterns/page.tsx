"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp, listVariants, itemVariants } from "@/lib/motion";
import { cn, todayString } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import {
  Zap,
  Users,
  AlertCircle,
  Heart,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  RotateCcw,
  BrainCircuit,
  Plus,
  Trash2,
  Pencil,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Tab definition
// ─────────────────────────────────────────────────────────────────────────────

type PatternTab = "energy" | "people" | "problems" | "giving";

const TABS: { key: PatternTab; label: string; icon: React.ElementType }[] = [
  { key: "energy",   label: "Energy",   icon: Zap },
  { key: "people",   label: "People",   icon: Users },
  { key: "problems", label: "Problems", icon: AlertCircle },
  { key: "giving",   label: "Giving",   icon: Heart },
];

// ─────────────────────────────────────────────────────────────────────────────
// Page-level loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="max-w-3xl space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ENERGY TAB — all logic and sub-components from energy/page.tsx
// ─────────────────────────────────────────────────────────────────────────────

type DayScore = { date: string; score: number; keywords: string[] };
type Factor = { factor: string; count: number };

function scoreColor(score: number) {
  if (score <= 3) return "bg-rose-500";
  if (score <= 6) return "bg-amber-400";
  return "bg-emerald-500";
}
function scoreText(score: number) {
  if (score <= 3) return "text-rose-500";
  if (score <= 6) return "text-amber-500";
  return "text-emerald-500";
}

function EnergyHeatmap({ dayScores }: { dayScores: DayScore[] }) {
  const today = new Date();
  const days: { dateStr: string; score: number | null; keywords: string[] }[] = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const found = dayScores.find((ds) => ds.date === dateStr);
    days.push({ dateStr, score: found?.score ?? null, keywords: found?.keywords ?? [] });
  }

  const [tooltip, setTooltip] = useState<{ dateStr: string; score: number; keywords: string[] } | null>(null);
  const startDow = new Date(days[0].dateStr + "T00:00:00").getDay();
  const blanks = Array.from({ length: startDow });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1.5">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-[10px] text-muted-foreground/50 text-center font-medium py-1">{d}</div>
        ))}
        {blanks.map((_, i) => <div key={`b-${i}`} />)}
        {days.map(({ dateStr, score, keywords }) => (
          <motion.div
            key={dateStr}
            whileHover={score !== null ? { scale: 1.15 } : {}}
            transition={{ duration: 0.15 }}
            className={cn(
              "aspect-square rounded-lg cursor-default transition-colors",
              score !== null ? scoreColor(score) : "bg-muted/40 border border-border/20"
            )}
            onMouseEnter={() => score !== null ? setTooltip({ dateStr, score, keywords }) : undefined}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
      </div>

      <AnimatePresence>
        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="rounded-xl border border-border/50 bg-card px-3 py-2 w-fit text-xs"
          >
            <span className={cn("font-semibold", scoreText(tooltip.score))}>
              {tooltip.dateStr} — {tooltip.score}/10
            </span>
            {tooltip.keywords.length > 0 && (
              <span className="ml-2 text-muted-foreground">{tooltip.keywords.join(", ")}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-4 pt-1">
        <span className="text-xs text-muted-foreground/50">Scale:</span>
        {[
          { color: "bg-rose-500", label: "1–3 Drained" },
          { color: "bg-amber-400", label: "4–6 Neutral" },
          { color: "bg-emerald-500", label: "7–10 Energized" },
          { color: "bg-muted/40 border border-border/30", label: "No data" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={cn("w-2.5 h-2.5 rounded-sm", color)} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function FactorList({ factors, label, variant }: {
  factors: Factor[];
  label: string;
  variant: "drain" | "recharge";
}) {
  const max = factors[0]?.count ?? 1;
  const accent = variant === "drain"
    ? { icon: "bg-rose-500/10 text-rose-500", bar: "bg-rose-500", dot: "bg-rose-400" }
    : { icon: "bg-emerald-500/10 text-emerald-500", bar: "bg-emerald-500", dot: "bg-emerald-400" };

  return (
    <motion.div {...fadeUp(variant === "drain" ? 0.2 : 0.25)} className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", accent.icon)}>
          {variant === "drain"
            ? <TrendingDown className="w-4 h-4" />
            : <TrendingUp className="w-4 h-4" />}
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground/40">{label}</p>
        </div>
      </div>

      {factors.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No patterns detected yet.</p>
      ) : (
        <motion.ul
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3"
        >
          {factors.map(({ factor, count }) => (
            <motion.li key={factor} variants={itemVariants} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/90">{factor}</span>
                <span className="text-xs text-muted-foreground tabular-nums font-medium">{count}×</span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className={cn("h-full rounded-full", accent.bar)}
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / max) * 100}%` }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </motion.div>
  );
}

function EnergyTab({ userId }: { userId: Id<"users"> }) {
  const analyzeEnergy = useAction(api.ai.analyzeEnergy);
  const analysis = useQuery(
    api.aiInternal.getEnergyAnalysisPublic,
    { userId }
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (analysis === null) {
      setLoading(true);
      analyzeEnergy({ userId })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [analysis, analyzeEnergy, userId]);

  const handleReanalyze = async () => {
    setLoading(true);
    try {
      await analyzeEnergy({ userId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleReanalyze}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          {loading ? "Analyzing…" : "Re-analyze"}
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {(loading && !analysis) || analysis === undefined ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-border bg-card p-5 space-y-4"
          >
            <Skeleton className="h-4 w-40" />
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 63 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
          </motion.div>
        ) : analysis ? (
          <motion.div key="data" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <motion.div {...fadeUp(0.08)} className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/40">
                60-Day Energy Heatmap
              </p>
              <EnergyHeatmap dayScores={analysis.dayScores} />
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FactorList factors={analysis.drainFactors}    label="Drain Triggers"    variant="drain"    />
              <FactorList factors={analysis.rechargeFactors} label="Recharge Patterns" variant="recharge" />
            </div>

            <motion.p {...fadeUp(0.3)} className="text-xs text-muted-foreground/50 text-center">
              Last analyzed {new Date(analysis.analyzedAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            </motion.p>
          </motion.div>
        ) : (
          <motion.div key="empty" {...fadeUp(0.1)}>
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted/50 mx-auto flex items-center justify-center">
                <Zap className="w-5 h-5 text-muted-foreground/30" />
              </div>
              <p className="font-heading text-lg text-muted-foreground/50 italic">No energy data yet.</p>
              <p className="text-sm text-muted-foreground/40 max-w-xs mx-auto leading-relaxed">
                Fill in the emotional check-in on your daily report and patterns will emerge here.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PEOPLE TAB — all logic and sub-components from people/page.tsx
// ─────────────────────────────────────────────────────────────────────────────

function PeopleEmptyState({ icon: Icon, headline, body, cta }: {
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

function PeopleTab({ userId }: { userId: Id<"users"> }) {
  const data = useQuery(
    api.reports.getPeopleInsights,
    { userId }
  );

  if (data === undefined) {
    return (
      <div className="space-y-6">
        <div className="flex gap-3">
          <Skeleton className="h-20 flex-1 rounded-2xl" />
          <Skeleton className="h-20 flex-1 rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            <div className="py-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-muted/50 mx-auto flex items-center justify-center">
                <Users className="w-5 h-5 text-muted-foreground/30" />
              </div>
              <p className="font-heading text-lg text-muted-foreground/50 italic">No connections tracked yet.</p>
              <p className="text-sm text-muted-foreground/40 max-w-xs mx-auto leading-relaxed">
                Track who you talk to in the daily report and your network map grows here.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROBLEMS TAB — all logic and sub-components from problems/page.tsx
// ─────────────────────────────────────────────────────────────────────────────

function ProblemsEmptyState({ icon: Icon, headline, body }: {
  icon: React.ElementType;
  headline: string;
  body: string;
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
    </motion.div>
  );
}

type Problem = {
  title: string;
  firstSeen: string;
  lastSeen: string;
  solutions: string[];
  occurrences: number;
  solvedManually: boolean | null;
  aiResolved: boolean | null;
  aiEvidence: string | null;
  resolvedAt: number | null;
};

function isSolved(p: Problem) {
  return p.solvedManually === true || (p.solvedManually === null && p.aiResolved === true);
}

function statusLabel(p: Problem) {
  if (p.solvedManually === true) return "Resolved";
  if (p.solvedManually === false) return "Open";
  if (p.aiResolved === true) return "AI: likely resolved";
  if (p.aiResolved === false) return "AI: still open";
  return "Unknown";
}

function statusColor(p: Problem) {
  if (p.solvedManually === true) return "text-green-600 dark:text-green-400";
  if (p.solvedManually === false) return "text-red-500 dark:text-red-400";
  if (p.aiResolved === true) return "text-emerald-500 dark:text-emerald-400";
  if (p.aiResolved === false) return "text-amber-500 dark:text-amber-400";
  return "text-muted-foreground";
}

function ProblemCard({
  problem,
  onToggle,
}: {
  problem: Problem;
  onToggle: (title: string, solved: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const solved = isSolved(problem);

  return (
    <Card className={cn("transition-opacity", solved && "opacity-60")}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start gap-3">
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => onToggle(problem.title, !solved)}
            className={cn(
              "mt-0.5 shrink-0 transition-colors",
              solved
                ? "text-green-500 hover:text-muted-foreground"
                : "text-muted-foreground/40 hover:text-green-500"
            )}
            title={solved ? "Mark as open" : "Mark as resolved"}
          >
            {solved ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </motion.button>

          <div className="flex-1 min-w-0">
            <CardTitle
              className={cn(
                "text-sm font-semibold leading-snug",
                solved && "line-through text-muted-foreground"
              )}
            >
              {problem.title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
              {solved && problem.resolvedAt ? (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Resolved {format(new Date(problem.resolvedAt), "MMM d, yyyy")}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  First seen {format(parseISO(problem.firstSeen), "MMM d, yyyy")}
                </span>
              )}
              {problem.occurrences > 1 && (
                <span className="text-xs text-muted-foreground">
                  · {problem.occurrences}× recurring
                </span>
              )}
              {!solved && (
                <span className={cn("text-xs font-medium", statusColor(problem))}>
                  · {statusLabel(problem)}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      {(problem.solutions.length > 0 || problem.aiEvidence) && (
        <CardContent className="px-4 pb-4 pt-0 pl-12">
          {problem.solutions.length > 0 && (
            <div className="mt-1">
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {expanded ? "Hide" : "Show"} proposed solutions
              </button>
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 space-y-1.5">
                      {problem.solutions.map((s, i) => (
                        <p key={i} className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                          {s}
                        </p>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {problem.aiEvidence && (
            <div className="mt-2 flex gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
              <BrainCircuit className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {problem.aiEvidence}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function ProblemsTab({ userId }: { userId: Id<"users"> }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [resolvedOpen, setResolvedOpen] = useState(false);

  const problems = useQuery(
    api.problems.getAllProblems,
    { userId }
  ) as Problem[] | undefined;

  const setProblemStatus = useMutation(api.problems.setProblemStatus);
  const analyzeProblemResolution = useAction(api.ai.analyzeProblemResolution);

  async function handleToggle(title: string, solved: boolean) {
    try {
      await setProblemStatus({ userId, problemTitle: title, solvedManually: solved });
    } catch {
      toast.error("Failed to update problem status.");
    }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const result = await analyzeProblemResolution({ userId });
      if (result.analyzed > 0) {
        toast.success(`AI analyzed ${result.analyzed} problem${result.analyzed === 1 ? "" : "s"}.`);
      } else {
        toast.info("No problems or reports found to analyze.");
      }
    } catch {
      toast.error("AI analysis failed. Make sure your reports are submitted.");
    } finally {
      setAnalyzing(false);
    }
  }

  const { openProblems, resolvedProblems } = useMemo(() => {
    if (!problems) return { openProblems: [], resolvedProblems: [] };
    return {
      openProblems: problems.filter((p) => !isSolved(p)),
      resolvedProblems: problems
        .filter((p) => isSolved(p))
        .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0)),
    };
  }, [problems]);

  return (
    <div className="space-y-6">
      {/* AI analysis button */}
      <motion.div {...fadeUp(0)} className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={handleAnalyze}
          disabled={analyzing || !problems || problems.length === 0}
          className="shrink-0"
        >
          <BrainCircuit className="w-4 h-4 mr-1.5" />
          {analyzing ? "Analyzing…" : "AI Analysis"}
        </Button>
      </motion.div>

      {/* Stats strip */}
      {problems && problems.length > 0 && (
        <motion.div
          className="grid grid-cols-3 gap-3"
          initial="hidden"
          animate="visible"
          variants={listVariants}
        >
          {([
            { label: "Total", count: problems.length, color: "text-foreground" },
            { label: "Open", count: openProblems.length, color: "text-amber-500" },
            { label: "Resolved", count: resolvedProblems.length, color: "text-emerald-500" },
          ]).map(({ label, count, color }) => (
            <motion.div
              key={label}
              variants={itemVariants}
              className="rounded-xl border border-border p-3 text-center"
            >
              <div className={cn("text-2xl font-bold", color)}>{count}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Problem list */}
      {problems === undefined ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : problems.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted/50 mx-auto flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-muted-foreground/30" />
          </div>
          <p className="font-heading text-lg text-muted-foreground/50 italic">No problems logged.</p>
          <p className="text-sm text-muted-foreground/40 max-w-xs mx-auto leading-relaxed">
            Write down what&apos;s blocking you in the daily form. Seeing them named is the first step.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Open problems */}
          {openProblems.length > 0 && (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {openProblems.map((problem) => (
                  <motion.div
                    key={problem.title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12, transition: { duration: 0.18 } }}
                    layout
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <ProblemCard problem={problem} onToggle={handleToggle} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {openProblems.length === 0 && resolvedProblems.length > 0 && (
            <ProblemsEmptyState
              icon={CheckCircle2}
              headline="Nothing unsolved"
              body="Every logged problem has been resolved. Your resolved history is below."
            />
          )}

          {/* Resolved section (collapsible) */}
          {resolvedProblems.length > 0 && (
            <div>
              <button
                onClick={() => setResolvedOpen((v) => !v)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 w-full"
              >
                <ChevronRight className={cn("w-4 h-4 transition-transform", resolvedOpen && "rotate-90")} />
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-medium">Resolved</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{resolvedProblems.length}</span>
                <RotateCcw className="w-3.5 h-3.5 ml-auto opacity-50" />
                <span className="text-xs opacity-50">click any to reopen</span>
              </button>

              <AnimatePresence>
                {resolvedOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 mt-2">
                      {resolvedProblems.map((problem) => (
                        <ProblemCard key={problem.title} problem={problem} onToggle={handleToggle} />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* AI info banner */}
      {problems && problems.length > 0 && !problems.some((p) => p.aiEvidence) && (
        <motion.div {...fadeUp(0.3)}>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="py-4 flex items-start gap-3">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Hit <strong className="text-foreground">AI Analysis</strong> to cross-reference your problems against your
                daily reports — Claude will check what you said you solved and what you planned, and surface which
                problems are likely still open.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GIVING TAB — all logic and sub-components from giving/page.tsx
// ─────────────────────────────────────────────────────────────────────────────

function GivingEmptyState({ icon: Icon, headline, body }: {
  icon: React.ElementType;
  headline: string;
  body: string;
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
    </motion.div>
  );
}

type GivingEntry = {
  _id: Id<"givingEntries">;
  text: string;
  date: string;
  createdAt: number;
};

function EntryRow({
  entry,
  onRemove,
  onUpdateText,
}: {
  entry: GivingEntry;
  onRemove: () => void;
  onUpdateText: (t: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== entry.text) onUpdateText(trimmed);
    else setDraft(entry.text);
    setEditing(false);
  }

  return (
    <div className="group flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-muted/50 transition-colors">
      <Heart className="w-4 h-4 text-rose-400 shrink-0 fill-rose-400/30" />

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(entry.text); setEditing(false); }
          }}
          className="flex-1 text-sm bg-transparent border-b border-primary focus:outline-none pb-0.5"
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className="flex-1 text-sm cursor-default select-none leading-snug"
        >
          {entry.text}
        </span>
      )}

      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="p-1 text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onRemove}
          className="p-1 text-muted-foreground hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function AddRow({ onAdd }: { onAdd: (text: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) ref.current?.focus();
  }, [adding]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onAdd(t);
    setText("");
    ref.current?.focus();
  }

  if (adding) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2.5 px-2 py-2">
        <Heart className="w-4 h-4 text-rose-400/40 shrink-0" />
        <input
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => { if (!text.trim()) setAdding(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") { setAdding(false); setText(""); } }}
          placeholder="How did you give or add value today?"
          className="flex-1 text-sm bg-transparent border-b border-primary focus:outline-none pb-0.5 placeholder:text-muted-foreground/50"
        />
        <button type="submit" disabled={!text.trim()} className="text-xs font-medium text-primary disabled:opacity-40">
          Add
        </button>
        <button type="button" onClick={() => { setAdding(false); setText(""); }} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </form>
    );
  }

  return (
    <button
      onClick={() => setAdding(true)}
      className="flex items-center gap-2.5 px-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
    >
      <Plus className="w-4 h-4" />
      Add entry
    </button>
  );
}

function givingDateLabel(date: string, todayStr: string): string {
  if (date === todayStr) return "Today";
  const yesterday = new Date(todayStr);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date === yesterday.toISOString().split("T")[0]) return "Yesterday";
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function PastDaySection({
  date,
  entries,
  todayStr,
}: {
  date: string;
  entries: GivingEntry[];
  todayStr: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-medium">{givingDateLabel(date, todayStr)}</span>
          <span className="text-xs text-muted-foreground">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", expanded && "rotate-90")} />
      </button>
      {expanded && (
        <div className="px-2 pb-2 border-t border-border bg-muted/20 space-y-0.5 pt-1">
          {entries.map((e) => (
            <div key={e._id} className="flex items-center gap-2.5 px-2 py-1.5">
              <Heart className="w-4 h-4 text-rose-400 shrink-0 fill-rose-400/30" />
              <span className="text-sm text-muted-foreground leading-snug">{e.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function offsetDate(base: string, days: number): string {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function GivingTab({ userId }: { userId: Id<"users"> }) {
  const todayStr = todayString();
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const entries = useQuery(
    api.giving.listByDate,
    { userId, date: selectedDate }
  );
  const recent = useQuery(
    api.giving.listRecent,
    { userId }
  );

  const addEntry = useMutation(api.giving.add).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.giving.listByDate, { userId, date: args.date });
    if (current === undefined) return;
    const tempId = `optimistic-${Date.now()}` as Id<"givingEntries">;
    localStore.setQuery(api.giving.listByDate, { userId, date: args.date }, [
      ...current,
      { _id: tempId, _creationTime: Date.now(), userId, date: args.date, text: args.text, createdAt: Date.now() },
    ]);
  });

  const removeEntry = useMutation(api.giving.remove).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.giving.listByDate, { userId, date: selectedDate });
    if (current === undefined) return;
    localStore.setQuery(
      api.giving.listByDate,
      { userId, date: selectedDate },
      current.filter((e) => e._id !== args.id)
    );
  });

  const updateText = useMutation(api.giving.updateText).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.giving.listByDate, { userId, date: selectedDate });
    if (current === undefined) return;
    localStore.setQuery(
      api.giving.listByDate,
      { userId, date: selectedDate },
      current.map((e) => e._id === args.id ? { ...e, text: args.text } : e)
    );
  });

  async function handleAdd(text: string) {
    try {
      await addEntry({ userId, date: selectedDate, text });
    } catch {
      toast.error("Failed to add entry.");
    }
  }

  const pastGroups: Record<string, GivingEntry[]> = {};
  if (recent) {
    for (const e of recent) {
      if (e.date === selectedDate) continue;
      if (!pastGroups[e.date]) pastGroups[e.date] = [];
      pastGroups[e.date].push(e as GivingEntry);
    }
  }
  const pastDates = Object.keys(pastGroups).sort((a, b) => b.localeCompare(a)).slice(0, 13);

  const isToday = selectedDate === todayStr;
  const canGoForward = selectedDate < todayStr;

  return (
    <div className="space-y-6">
      {/* Date navigator */}
      <motion.div {...fadeUp(0.08)} className="flex items-center gap-2 justify-center">
        <button
          onClick={() => setSelectedDate(offsetDate(selectedDate, -1))}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium min-w-[160px] text-center">
          {givingDateLabel(selectedDate, todayStr)}
        </span>
        <button
          onClick={() => setSelectedDate(offsetDate(selectedDate, 1))}
          disabled={!canGoForward}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {!isToday && (
          <button
            onClick={() => setSelectedDate(todayStr)}
            className="text-xs text-primary hover:underline ml-1"
          >
            Today
          </button>
        )}
      </motion.div>

      {/* Today / Selected day entries */}
      <motion.div {...fadeUp(0.13)} className="rounded-2xl border border-border bg-card p-4 space-y-0.5">
        <div className="flex items-center gap-2 px-2 mb-3">
          <Heart className="w-4 h-4 text-rose-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isToday ? "Today's giving" : givingDateLabel(selectedDate, todayStr)}
          </p>
          {entries && entries.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
          )}
        </div>

        {entries === undefined ? (
          <div className="space-y-2 px-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 italic px-2 py-1">
            {isToday ? "Nothing yet — how have you given value today?" : "No entries for this day."}
          </p>
        ) : (
          <AnimatePresence initial={false}>
            <motion.div
              className="space-y-0.5"
              variants={listVariants}
              initial="hidden"
              animate="visible"
            >
              {(entries as GivingEntry[]).map((e) => (
                <motion.div key={e._id} variants={itemVariants}>
                  <EntryRow
                    entry={e}
                    onRemove={() => removeEntry({ id: e._id })}
                    onUpdateText={(t) => updateText({ id: e._id, text: t })}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        <AddRow onAdd={handleAdd} />
      </motion.div>

      {/* Past entries history */}
      {pastDates.length > 0 && (
        <motion.div {...fadeUp(0.18)} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-1">
            Past days
          </p>
          <AnimatePresence>
            {pastDates.map((date, index) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
              >
                <PastDaySection
                  date={date}
                  entries={pastGroups[date]}
                  todayStr={todayStr}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {pastDates.length === 0 && entries !== undefined && entries.length === 0 && (
        <div className="py-16 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted/50 mx-auto flex items-center justify-center">
            <Heart className="w-5 h-5 text-muted-foreground/30" />
          </div>
          <p className="font-heading text-lg text-muted-foreground/50 italic">No giving entries yet.</p>
          <p className="text-sm text-muted-foreground/40 max-w-xs mx-auto leading-relaxed">
            Log what you contributed to others. It matters more than you think.
          </p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function PatternsPage() {
  const [activeTab, setActiveTab] = useState<PatternTab>("energy");
  const { convexUserId, isLoading } = useConvexUser();

  if (isLoading || !convexUserId) return <LoadingSkeleton />;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Page header */}
      <motion.div {...fadeUp(0)}>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">Patterns</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          How you spend energy, who you connect with, what you solve, and how you give.
        </p>
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/60">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {activeTab === "energy"   && <EnergyTab   userId={convexUserId} />}
          {activeTab === "people"   && <PeopleTab   userId={convexUserId} />}
          {activeTab === "problems" && <ProblemsTab userId={convexUserId} />}
          {activeTab === "giving"   && <GivingTab   userId={convexUserId} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
