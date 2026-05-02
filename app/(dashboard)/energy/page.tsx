"use client";

import { useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp, listVariants, itemVariants } from "@/lib/motion";
import { Zap, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function EnergyPage() {
  const { convexUserId } = useConvexUser();
  const analyzeEnergy = useAction(api.ai.analyzeEnergy);
  const analysis = useQuery(
    api.aiInternal.getEnergyAnalysisPublic,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (convexUserId && analysis === null) {
      setLoading(true);
      analyzeEnergy({ userId: convexUserId })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [convexUserId, analysis, analyzeEnergy]);

  const handleReanalyze = async () => {
    if (!convexUserId) return;
    setLoading(true);
    try {
      await analyzeEnergy({ userId: convexUserId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">

      <motion.div {...fadeUp(0)} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">Energy</h1>
          <p className="text-sm text-muted-foreground mt-0.5">How your emotional energy flows over time.</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleReanalyze}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 shrink-0 mt-1"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          {loading ? "Analyzing…" : "Re-analyze"}
        </motion.button>
      </motion.div>

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
          <motion.div
            key="empty"
            {...fadeUp(0.1)}
            className="rounded-2xl border border-dashed border-border/60 bg-muted/10 p-10 text-center space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
              <Zap className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-sm font-medium">No energy data yet</p>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Fill in the emotional drain field in your daily reports to unlock energy pattern tracking.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
