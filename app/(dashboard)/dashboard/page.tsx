"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { BentoCard } from "@/components/bento/BentoCard";
import { ScoreRing } from "@/components/bento/ScoreRing";
import { PageHeader } from "@/components/bento/PageHeader";
import { LineTrend, RadarScores } from "@/components/charts/Charts";
import { TimezoneModal } from "@/components/dashboard/TimezoneModal";
import { AIPatterns } from "@/components/analytics/AIPatterns";
import { AREAS, type AreaKey, scoreLabel, creditLabel } from "@/lib/areas";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import Link from "next/link";

function Trend({ value }: { value: number }) {
  if (value === 0) return <span className="inline-flex items-center gap-0.5 text-muted-foreground text-xs"><Minus className="w-3 h-3" /></span>;
  const up = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-400" : "text-rose-400"}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? "+" : ""}{value}
    </span>
  );
}

export default function DashboardPage() {
  const { convexUserId, convexUser } = useConvexUser();
  const [showTz, setShowTz] = useState(false);
  const score = useQuery(api.lifeScore.getCurrent, convexUserId ? { userId: convexUserId, windowDays: 14 } : "skip");
  const series = useQuery(api.lifeScore.getSeries, convexUserId ? { userId: convexUserId, days: 30 } : "skip");

  useEffect(() => {
    if (convexUser && !convexUser.timezone) setShowTz(true);
  }, [convexUser]);

  if (!convexUserId || score === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  const areas = score?.areas ?? [];
  const radarData = areas.filter((a: any) => !a.needsData).map((a: any) => ({ area: AREAS[a.key as AreaKey].label, score: a.score }));

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        eyebrow="Overview"
        title="Your Life Score"
        subtitle="A weighted, credit-style score across all six dimensions of your life - last 14 days."
        action={
          <Link href="/analytics" className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium hover:bg-accent/70 transition-colors">
            Full analytics <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Composite credit score */}
        <BentoCard tint="var(--primary)" className="col-span-2 flex items-center gap-5" delay={0.02}>
          <ScoreRing value={score?.composite ?? 0} color="oklch(0.2 0.03 264)" size={120} stroke={11} track="oklch(0.2 0.03 264 / 20%)">
            <div className="text-center">
              <div className="text-3xl font-bold numeral leading-none">{score?.credit ?? "-"}</div>
              <div className="text-[10px] uppercase tracking-wide mt-1 opacity-70">/ 850</div>
            </div>
          </ScoreRing>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-70">Composite</p>
            <p className="text-2xl font-bold mt-0.5">{score ? creditLabel(score.credit) : ""}</p>
            <p className="text-sm mt-1 opacity-80">
              {score && score.compositeTrend !== 0 ? `${score.compositeTrend > 0 ? "+" : ""}${score.compositeTrend} pts vs prior 2 weeks` : "Holding steady"}
            </p>
          </div>
        </BentoCard>

        {/* Radar */}
        <BentoCard className="col-span-2 lg:row-span-2" delay={0.04}>
          <h2 className="font-semibold mb-1">Balance</h2>
          <p className="text-xs text-muted-foreground mb-2">How evenly you&apos;re investing across areas</p>
          {radarData.length >= 3 ? (
            <RadarScores data={radarData} height={260} />
          ) : (
            <div className="h-[260px] grid place-items-center text-center text-sm text-muted-foreground px-6">
              Log a few more areas to unlock your balance chart.
            </div>
          )}
        </BentoCard>

        {/* Area score tiles */}
        {areas.map((a: any, i: number) => {
          const meta = AREAS[a.key as AreaKey];
          const Icon = meta.icon;
          return (
            <BentoCard key={a.key} href={meta.href} className="flex flex-col gap-3" delay={0.04 + i * 0.03}>
              <div className="flex items-center justify-between">
                <span className="grid place-items-center w-9 h-9 rounded-xl" style={{ background: `color-mix(in oklch, ${meta.color} 18%, transparent)` }}>
                  <Icon className="w-[18px] h-[18px]" style={{ color: meta.color }} />
                </span>
                {!a.needsData && <Trend value={a.trend} />}
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold numeral">{a.needsData ? "-" : a.score}</span>
                  {!a.needsData && <span className="text-xs text-muted-foreground">/ 100</span>}
                </div>
                <p className="text-sm font-medium mt-0.5">{meta.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.needsData ? "No data yet" : scoreLabel(a.score)}</p>
              </div>
            </BentoCard>
          );
        })}
      </div>

      {/* Score over time */}
      <BentoCard delay={0.1}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold">Life Score over time</h2>
            <p className="text-xs text-muted-foreground">Last 30 days · composite</p>
          </div>
          <Link href="/analytics" className="text-xs text-muted-foreground hover:text-foreground">Compare areas →</Link>
        </div>
        {series && series.length > 0 ? (
          <LineTrend data={series} series={[{ key: "composite", name: "Life Score", color: "var(--primary)" }]} height={220} />
        ) : (
          <div className="h-[220px] grid place-items-center text-sm text-muted-foreground">Not enough history yet.</div>
        )}
      </BentoCard>

      {/* AI cross-domain patterns */}
      <AIPatterns userId={convexUserId} />

      {convexUserId && <TimezoneModal userId={convexUserId} open={showTz} onClose={() => setShowTz(false)} />}
    </div>
  );
}
