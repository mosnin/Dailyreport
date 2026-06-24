"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { BentoCard } from "@/components/bento/BentoCard";
import { PageHeader } from "@/components/bento/PageHeader";
import { LineTrend, AreaTrend, ScatterPlot, RadarScores } from "@/components/charts/Charts";
import { AREAS, AREA_ORDER, type AreaKey, scoreLabel } from "@/lib/areas";
import { Skeleton } from "@/components/ui/skeleton";

const RANGES = [30, 60, 90] as const;

function TrendBadge({ trend }: { trend?: number }) {
  if (trend == null || Number.isNaN(trend)) return null;
  const up = trend > 0;
  const flat = Math.abs(trend) < 0.5;
  return (
    <span
      className={cn(
        "text-[11px] font-semibold tabular-nums",
        flat
          ? "text-muted-foreground/60"
          : up
          ? "text-emerald-500"
          : "text-rose-500"
      )}
    >
      {flat ? "→" : up ? "▲" : "▼"} {Math.abs(Math.round(trend))}
    </span>
  );
}

export default function AnalyticsPage() {
  const { convexUserId } = useConvexUser();
  const [days, setDays] = useState<number>(30);

  const series = useQuery(
    api.lifeScore.getSeries,
    convexUserId ? { userId: convexUserId, days } : "skip"
  ) as any[] | undefined;

  const current = useQuery(
    api.lifeScore.getCurrent,
    convexUserId ? { userId: convexUserId, windowDays: 14 } : "skip"
  ) as any | undefined;

  const health = useQuery(
    api.health.getRecent,
    convexUserId ? { userId: convexUserId, days: 90 } : "skip"
  ) as any[] | undefined;

  const finance = useQuery(
    api.finances.getRecent,
    convexUserId ? { userId: convexUserId, days: 90 } : "skip"
  ) as any[] | undefined;

  // Loading state — wait for user + main series query.
  if (!convexUserId || series === undefined) {
    return (
      <div className="space-y-4 pb-6">
        <Skeleton className="h-10 w-64 rounded-3xl" />
        <Skeleton className="h-[320px] w-full rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Skeleton className="col-span-2 h-64 rounded-3xl" />
          <Skeleton className="col-span-2 h-64 rounded-3xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  const rows = Array.isArray(series) ? series : [];
  const healthRows = Array.isArray(health) ? health : [];
  const financeRows = Array.isArray(finance) ? finance : [];

  const areasByKey: Record<string, any> = {};
  for (const a of current?.areas ?? []) areasByKey[a.key] = a;

  // Radar — areas with data, only if >= 3.
  const radarData = (current?.areas ?? [])
    .filter((a: any) => !a.needsData && AREAS[a.key as AreaKey])
    .map((a: any) => ({ area: AREAS[a.key as AreaKey].label, score: a.score }));

  // Scatter datasets.
  const sleepMood = healthRows
    .filter((r) => r.sleepHours != null && r.mood != null)
    .map((r) => ({ sleepHours: r.sleepHours, mood: r.mood }));
  const exerciseEnergy = healthRows
    .filter((r) => r.exerciseMinutes != null && r.energy != null)
    .map((r) => ({ exerciseMinutes: r.exerciseMinutes, energy: r.energy }));
  const spendStress = financeRows
    .filter((r) => r.spending != null && r.financialStress != null)
    .map((r) => ({ spending: r.spending, financialStress: r.financialStress }));
  const stressMood = healthRows
    .filter((r) => r.stress != null && r.mood != null)
    .map((r) => ({ stress: r.stress, mood: r.mood }));

  const sparse = rows.length < 2;

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        eyebrow="Analytics"
        title="The full picture"
        subtitle="Every dimension of your life, measured over time."
        action={
          <div className="flex items-center gap-1 rounded-full bg-accent/40 p-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setDays(r)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  days === r
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-muted-foreground"
                )}
              >
                {r}d
              </button>
            ))}
          </div>
        }
      />

      {/* 1. Big multi-line chart */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <BentoCard className="col-span-2 lg:col-span-4" delay={0}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
            Trends
          </p>
          <h2 className="mt-1 text-lg font-semibold">Every area over time</h2>
          {sparse ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
              Log a few more days to see your trends take shape.
            </div>
          ) : (
            <div className="mt-3">
              <LineTrend
                data={rows}
                xKey="label"
                domain={[0, 100]}
                height={300}
                series={AREA_ORDER.map((key) => ({
                  key,
                  name: AREAS[key].label,
                  color: AREAS[key].color,
                }))}
              />
            </div>
          )}
        </BentoCard>

        {/* 2. Composite area + 3. Radar */}
        <BentoCard className="col-span-2" delay={0.05}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
            Overall
          </p>
          <h2 className="mt-1 text-lg font-semibold">Composite Life Score</h2>
          {sparse ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
              Not enough data yet.
            </div>
          ) : (
            <div className="mt-3">
              <AreaTrend
                data={rows}
                xKey="label"
                dataKey="composite"
                name="Composite"
                color="var(--primary)"
                domain={[0, 100]}
                height={200}
              />
            </div>
          )}
        </BentoCard>

        <BentoCard className="col-span-2" delay={0.1}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
            Balance
          </p>
          <h2 className="mt-1 text-lg font-semibold">Current balance</h2>
          {radarData.length >= 3 ? (
            <div className="mt-3">
              <RadarScores data={radarData} height={240} />
            </div>
          ) : (
            <div className="flex h-[240px] items-center justify-center text-center text-sm text-muted-foreground">
              Log across at least three areas to see your balance.
            </div>
          )}
        </BentoCard>
      </div>

      {/* 4. Trends by area */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
          Trends by area
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {AREA_ORDER.map((key, i) => {
            const meta = AREAS[key];
            const Icon = meta.icon;
            const area = areasByKey[key];
            const score = area?.score;
            return (
              <BentoCard key={key} href={meta.href} delay={0.04 * i}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" style={{ color: meta.color }} />
                    <span className="text-sm font-semibold">{meta.label}</span>
                  </div>
                  <TrendBadge trend={area?.trend} />
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums">
                    {score != null ? Math.round(score) : "—"}
                  </span>
                  {score != null && (
                    <span className="text-[11px] text-muted-foreground">
                      {scoreLabel(score)}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  {sparse ? (
                    <div className="flex h-[110px] items-center justify-center text-xs text-muted-foreground/60">
                      No data yet
                    </div>
                  ) : (
                    <AreaTrend
                      data={rows}
                      xKey="label"
                      dataKey={key}
                      name={meta.label}
                      color={meta.color}
                      domain={[0, 100]}
                      height={110}
                    />
                  )}
                </div>
              </BentoCard>
            );
          })}
        </div>
      </div>

      {/* 5. Correlations */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
          Correlations
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <CorrelationCard
            title="Sleep vs Mood"
            data={sleepMood}
            delay={0}
            scatter={
              <ScatterPlot
                data={sleepMood}
                xKey="sleepHours"
                yKey="mood"
                xName="Sleep (hrs)"
                yName="Mood"
                color="var(--emotional)"
                xDomain={[0, 12]}
                yDomain={[0, 10]}
              />
            }
          />
          <CorrelationCard
            title="Exercise vs Energy"
            data={exerciseEnergy}
            delay={0.05}
            scatter={
              <ScatterPlot
                data={exerciseEnergy}
                xKey="exerciseMinutes"
                yKey="energy"
                xName="Exercise (min)"
                yName="Energy"
                color="var(--health)"
                yDomain={[0, 10]}
              />
            }
          />
          <CorrelationCard
            title="Spending vs Money stress"
            data={spendStress}
            delay={0.1}
            scatter={
              <ScatterPlot
                data={spendStress}
                xKey="spending"
                yKey="financialStress"
                xName="Spending"
                yName="Money stress"
                color="var(--finance)"
                yDomain={[0, 10]}
              />
            }
          />
          <CorrelationCard
            title="Stress vs Mood"
            data={stressMood}
            delay={0.15}
            scatter={
              <ScatterPlot
                data={stressMood}
                xKey="stress"
                yKey="mood"
                xName="Stress"
                yName="Mood"
                color="var(--progress)"
                xDomain={[0, 10]}
                yDomain={[0, 10]}
              />
            }
          />
        </div>
      </div>
    </div>
  );
}

function CorrelationCard({
  title,
  data,
  scatter,
  delay,
}: {
  title: string;
  data: any[];
  scatter: React.ReactNode;
  delay?: number;
}) {
  const ready = Array.isArray(data) && data.length >= 3;
  return (
    <BentoCard delay={delay}>
      <h3 className="text-sm font-semibold">{title}</h3>
      {ready ? (
        <div className="mt-2">{scatter}</div>
      ) : (
        <div className="mt-2 flex h-[200px] items-center justify-center text-center text-sm text-muted-foreground">
          Log more to see this correlation
        </div>
      )}
    </BentoCard>
  );
}
