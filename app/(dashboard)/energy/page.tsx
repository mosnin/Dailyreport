"use client";

import { useEffect, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { motion } from "motion/react";
import { fadeUp, listVariants, itemVariants } from "@/lib/motion";
import { Zap, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type DayScore = { date: string; score: number; keywords: string[] };
type Factor = { factor: string; count: number };

function scoreColor(score: number): string {
  if (score <= 3) return "bg-rose-500";
  if (score <= 6) return "bg-amber-400";
  return "bg-emerald-500";
}

function scoreBg(score: number): string {
  if (score <= 3) return "bg-rose-500/15";
  if (score <= 6) return "bg-amber-400/15";
  return "bg-emerald-500/15";
}

function scoreText(score: number): string {
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
          <div key={d} className="text-[10px] text-muted-foreground text-center font-medium">{d}</div>
        ))}
        {blanks.map((_, i) => <div key={`b-${i}`} />)}
        {days.map(({ dateStr, score, keywords }) => (
          <div
            key={dateStr}
            className={cn(
              "aspect-square rounded-md cursor-pointer transition-transform hover:scale-110 relative",
              score !== null ? scoreColor(score) : "bg-muted/40 border border-border/30"
            )}
            onMouseEnter={() => score !== null ? setTooltip({ dateStr, score, keywords }) : undefined}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
      </div>

      {tooltip && (
        <div className="text-xs text-muted-foreground bg-card border border-border/50 rounded-lg px-3 py-2 w-fit">
          <span className={cn("font-semibold", scoreText(tooltip.score))}>
            {tooltip.dateStr} — {tooltip.score}/10
          </span>
          {tooltip.keywords.length > 0 && (
            <span className="ml-2 text-muted-foreground">{tooltip.keywords.join(", ")}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 pt-1">
        <span className="text-xs text-muted-foreground">Energy scale:</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-rose-500" />
          <span className="text-xs text-muted-foreground">1–3 Drained</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-400" />
          <span className="text-xs text-muted-foreground">4–6 Neutral</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="text-xs text-muted-foreground">7–10 Energized</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-muted/40 border border-border/30" />
          <span className="text-xs text-muted-foreground">No data</span>
        </div>
      </div>
    </div>
  );
}

function FactorList({ factors, icon, label, variant }: {
  factors: Factor[];
  icon: React.ReactNode;
  label: string;
  variant: "drain" | "recharge";
}) {
  const max = factors[0]?.count ?? 1;
  const iconBg = variant === "drain" ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500";
  const barColor = variant === "drain" ? "bg-rose-500" : "bg-emerald-500";
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className={cn("p-1.5 rounded-lg", iconBg)}>{icon}</span>
        <h3 className="font-semibold text-sm">{label}</h3>
      </div>
      {factors.length === 0 ? (
        <p className="text-sm text-muted-foreground">No patterns detected yet.</p>
      ) : (
        <motion.ul
          variants={listVariants}
          initial="hidden"
          animate="visible"
          className="space-y-2.5"
        >
          {factors.map(({ factor, count }) => (
            <motion.li key={factor} variants={itemVariants} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground/90">{factor}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{count}×</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", barColor)}
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </div>
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
    if (!convexUserId || analysis !== undefined) return;
  }, [convexUserId, analysis]);

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <motion.div {...fadeUp(0)} className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h1 className="text-2xl font-bold tracking-tight">Energy</h1>
          </div>
          <p className="text-muted-foreground text-sm">How your emotional energy flows over time</p>
        </div>
        <button
          onClick={handleReanalyze}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          {loading ? "Analyzing…" : "Re-analyze"}
        </button>
      </motion.div>

      {loading && !analysis && (
        <motion.div {...fadeUp(0.1)} className="rounded-2xl border border-border/50 bg-card p-8 flex items-center justify-center">
          <div className="text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-muted-foreground animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Analyzing your energy patterns…</p>
          </div>
        </motion.div>
      )}

      {analysis && (
        <>
          <motion.div {...fadeUp(0.1)} className="rounded-2xl border border-border/50 bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">60-Day Energy Heatmap</h2>
            <EnergyHeatmap dayScores={analysis.dayScores} />
          </motion.div>

          <motion.div {...fadeUp(0.2)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FactorList
              factors={analysis.drainFactors}
              label="Drain Triggers"
              variant="drain"
              icon={<TrendingDown className="w-4 h-4" />}
            />
            <FactorList
              factors={analysis.rechargeFactors}
              label="Recharge Patterns"
              variant="recharge"
              icon={<TrendingUp className="w-4 h-4" />}
            />
          </motion.div>

          <motion.p {...fadeUp(0.3)} className="text-xs text-muted-foreground text-center">
            Last analyzed {new Date(analysis.analyzedAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          </motion.p>
        </>
      )}

      {analysis === null && !loading && (
        <motion.div {...fadeUp(0.1)} className="rounded-2xl border border-border/50 bg-card p-8 text-center space-y-3">
          <Zap className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">No daily reports with energy data found yet. Fill in the emotional drain field in your daily reports to unlock energy tracking.</p>
        </motion.div>
      )}
    </div>
  );
}
