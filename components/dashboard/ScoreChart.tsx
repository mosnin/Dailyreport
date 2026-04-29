"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, Star, CheckCircle2, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

const RANGE_OPTIONS = [
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
  { label: "90d", days: 90 },
];

// ── Custom tooltip ─────────────────────────────────────────────────────────

function ScoreTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { report: boolean; affirmations: boolean; visualizations: boolean; earned: number } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;

  return (
    <div className="rounded-xl border border-border bg-card shadow-lg px-3 py-2.5 text-xs space-y-1.5 min-w-[140px]">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">
        Score: <span className="font-semibold text-foreground">{payload[0].value}</span>
      </p>
      {d.earned === 1 && (
        <p className="text-emerald-600 dark:text-emerald-400 font-medium">+1 perfect day</p>
      )}
      <div className="pt-1 border-t border-border space-y-0.5">
        <div className={cn("flex items-center gap-1.5", d.report ? "text-foreground" : "text-muted-foreground/50")}>
          <div className={cn("w-1.5 h-1.5 rounded-full", d.report ? "bg-emerald-400" : "bg-muted")} />
          Daily report
        </div>
        <div className={cn("flex items-center gap-1.5", d.affirmations ? "text-foreground" : "text-muted-foreground/50")}>
          <div className={cn("w-1.5 h-1.5 rounded-full", d.affirmations ? "bg-amber-400" : "bg-muted")} />
          Affirmations ×5
        </div>
        <div className={cn("flex items-center gap-1.5", d.visualizations ? "text-foreground" : "text-muted-foreground/50")}>
          <div className={cn("w-1.5 h-1.5 rounded-full", d.visualizations ? "bg-sky-400" : "bg-muted")} />
          Visualizations
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function ScoreChart({ userId }: { userId: Id<"users"> }) {
  const [days, setDays] = useState(30);
  const result = useQuery(api.scores.getDailyScores, { userId, days });

  if (!result) return null;

  const { data, totalScore, perfectDays } = result;

  // X-axis label: show every ~7 days to avoid crowding
  const labelInterval = Math.max(1, Math.floor(days / 8));

  // Determine max Y for padding
  const maxScore = Math.max(totalScore, 1);
  const yMax = maxScore + Math.ceil(maxScore * 0.15);

  // Today earned?
  const todayEarned = data[data.length - 1]?.earned === 1;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-sky-500" />
            <h2 className="text-sm font-semibold">Consistency Score</h2>
            {todayEarned && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                +1 today
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold tabular-nums">{totalScore}</span>
            <span className="text-sm text-muted-foreground">
              {perfectDays} perfect {perfectDays === 1 ? "day" : "days"}
            </span>
          </div>
        </div>

        {/* Range selector */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setDays(opt.days)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                days === opt.days
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* What earns a point */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <span className="text-xs text-muted-foreground">Earn 1 pt/day by completing:</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Daily report
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="w-3 h-3 text-amber-400" />
            5 rounds
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Eye className="w-3 h-3 text-sky-400" />
            All visualizations
          </span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.18} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="currentColor"
            strokeOpacity={0.06}
          />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "currentColor", opacity: 0.45 }}
            tickLine={false}
            axisLine={false}
            interval={labelInterval}
          />

          <YAxis
            tick={{ fontSize: 10, fill: "currentColor", opacity: 0.45 }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            domain={[0, yMax]}
          />

          <Tooltip
            content={<ScoreTooltip />}
            cursor={{ stroke: "#0ea5e9", strokeWidth: 1, strokeOpacity: 0.3 }}
          />

          {/* Mark perfect days with a subtle reference dot via data */}
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#0ea5e9"
            strokeWidth={2}
            fill="url(#scoreGradient)"
            dot={(props) => {
              const { cx, cy, payload } = props as { cx: number; cy: number; payload: { earned: number } };
              if (!payload.earned) return <g key={`dot-${cx}-${cy}`} />;
              return (
                <circle
                  key={`dot-${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill="#0ea5e9"
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              );
            }}
            activeDot={{ r: 4, fill: "#0ea5e9", stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {totalScore === 0 && (
        <p className="text-center text-xs text-muted-foreground mt-3">
          Complete all three practices in a day to earn your first point.
        </p>
      )}
    </div>
  );
}
