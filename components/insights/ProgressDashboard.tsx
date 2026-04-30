"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type Scores = { momentum: number; execution: number; wellbeing: number; growth: number };
type Insight = { weekStartDate: string; scores?: Scores; content?: string };

function momentumLabel(v: number) {
  if (v >= 30) return "Accelerating";
  if (v >= 10) return "Improving";
  if (v > -10) return "Steady";
  if (v > -30) return "Slipping";
  return "Declining";
}

function MomentumDisplay({ value }: { value: number }) {
  const isUp = value > 10;
  const isDown = value < -10;
  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const color = isUp
    ? "text-emerald-500"
    : isDown
    ? "text-rose-500"
    : "text-muted-foreground";

  return (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/50">
        Momentum
      </p>
      <div className="flex items-end gap-3">
        <p className={cn("text-[52px] font-bold tabular-nums leading-none tracking-tight", color)}>
          {value > 0 ? "+" : ""}{value}
        </p>
        <div className={cn("flex items-center gap-1 pb-1.5", color)}>
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium">{momentumLabel(value)}</span>
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const color =
    pct >= 70
      ? "bg-emerald-500"
      : pct >= 40
      ? "bg-amber-500"
      : "bg-red-500";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums text-foreground">{pct}</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

type TooltipPayload = { payload?: Array<{ value: number }> };

function MomentumTooltip({ active, payload, label }: TooltipPayload & { active?: boolean; label?: string }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="rounded-lg bg-background ring-1 ring-foreground/10 px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-0.5">Week of {label}</p>
      <p className={cn("font-semibold", v > 0 ? "text-emerald-500" : v < 0 ? "text-rose-500" : "text-muted-foreground")}>
        {v > 0 ? "+" : ""}{v} momentum
      </p>
    </div>
  );
}

export function ProgressDashboard({ userId }: { userId: Id<"users"> }) {
  const history = useQuery(api.aiInternal.getProgressHistory, { userId });
  const analyzeProgress = useAction(api.ai.analyzeProgress);
  const analyzed = useRef(false);

  useEffect(() => {
    if (history === undefined) return;
    if (analyzed.current) return;
    analyzed.current = true;
    analyzeProgress({ userId }).catch(() => {});
  }, [history, userId, analyzeProgress]);

  if (history === undefined) {
    return (
      <div className="rounded-2xl border border-border/50 bg-muted/20 p-5 space-y-4">
        <Skeleton className="h-14 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  const scored = (history as Insight[]).filter((i) => i.scores);
  if (scored.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/50 bg-muted/10 px-5 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          Progress scores will appear after your first weekly insight is generated.
        </p>
      </div>
    );
  }

  const latest = scored[scored.length - 1].scores!;
  const chartData = scored.map((i) => ({
    week: i.weekStartDate.slice(5), // "MM-DD"
    momentum: i.scores!.momentum,
    execution: i.scores!.execution,
    wellbeing: i.scores!.wellbeing,
    growth: i.scores!.growth,
  }));

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-5">
      {/* Headline metric */}
      <MomentumDisplay value={latest.momentum} />

      {/* Three component scores */}
      <div className="space-y-2.5">
        <ScoreBar label="Execution" value={latest.execution} />
        <ScoreBar label="Wellbeing" value={latest.wellbeing} />
        <ScoreBar label="Growth" value={latest.growth} />
      </div>

      {/* 12-week momentum sparkline */}
      {chartData.length >= 2 && (
        <div>
          <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/50 mb-2">
            Momentum — {chartData.length}-week trend
          </p>
          <ResponsiveContainer width="100%" height={72}>
            <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <XAxis dataKey="week" hide />
              <YAxis domain={[-100, 100]} hide />
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <Tooltip content={<MomentumTooltip />} />
              <Line
                type="monotone"
                dataKey="momentum"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 2.5, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
