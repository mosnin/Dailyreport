"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { BentoCard } from "@/components/bento/BentoCard";
import { PageHeader } from "@/components/bento/PageHeader";
import { LineTrend, AreaTrend, RadarScores } from "@/components/charts/Charts";
import { trackerColor } from "@/lib/trackers";
import { cn, todayString } from "@/lib/utils";
import Link from "next/link";

const RANGES = [30, 60, 90];

export default function AnalyticsPage() {
  const { convexUserId } = useConvexUser();
  const [days, setDays] = useState(30);
  const today = todayString();
  const overview = useQuery(api.trackers.getOverview, convexUserId ? { userId: convexUserId } : "skip");
  const series = useQuery(api.trackers.getSeries, convexUserId ? { userId: convexUserId, days } : "skip");
  const recommendations = useQuery(api.trackerAI.getRecommendations, convexUserId ? { userId: convexUserId, date: today } : "skip");
  const runRecommend = useAction(api.trackerAI.recommend);

  // Generate today's cross-context recommendations once if missing and there's data.
  const recKicked = useRef(false);
  useEffect(() => {
    if (recKicked.current) return;
    if (!convexUserId || recommendations === undefined || recommendations !== null) return;
    if (!overview?.trackers?.length) return;
    recKicked.current = true;
    runRecommend({ userId: convexUserId, date: today }).catch(() => {});
  }, [convexUserId, recommendations, overview?.trackers?.length, runRecommend, today]);

  if (!convexUserId || overview === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  const trackers = overview?.trackers ?? [];
  if (trackers.length === 0) {
    return (
      <div className="space-y-4 pb-6">
        <PageHeader eyebrow="Analytics" title="The full picture" subtitle="Create trackers and your analytics appear here." />
        <BentoCard className="text-center py-10">
          <p className="font-semibold">Nothing to analyze yet</p>
          <p className="text-sm text-muted-foreground mt-1">Head to <Link href="/trackers" className="text-primary">Trackers</Link> to set up what you measure.</p>
        </BentoCard>
      </div>
    );
  }

  const seriesData = series?.series ?? [];
  const seriesTrackers = series?.trackers ?? [];
  const radarData = trackers.filter((t: any) => !t.needsData).map((t: any) => ({ area: t.name, score: t.score }));

  const rangeToggle = (
    <div className="flex gap-1">
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => setDays(r)}
          className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", days === r ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground")}
        >
          {r}d
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 pb-6">
      <PageHeader eyebrow="Analytics" title="The full picture" subtitle="Every tracker, measured over time." action={rangeToggle} />

      {/* AI recommendations: cross-references trackers + daily reports */}
      <BentoCard delay={0.01}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold">Recommendations</h2>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">AI</span>
        </div>
        {recommendations === undefined || (recommendations === null && !recKicked.current) ? (
          <p className="text-sm text-muted-foreground">Reading across your trackers and daily reports...</p>
        ) : recommendations === null ? (
          <p className="text-sm text-muted-foreground">Log a few trackers and daily reports and tailored recommendations appear here.</p>
        ) : (
          <>
            {recommendations.summary && <p className="text-sm text-muted-foreground mb-3">{recommendations.summary}</p>}
            <div className="space-y-2.5">
              {recommendations.items.map((it: any, i: number) => (
                <div key={i} className="rounded-2xl border border-border/50 bg-background/40 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{it.title}</p>
                    {it.focus && <span className="shrink-0 text-[11px] font-medium text-muted-foreground/70">{it.focus}</span>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground leading-snug">{it.detail}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </BentoCard>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* All trackers over time */}
        <BentoCard className="col-span-2 lg:col-span-4" delay={0.02}>
          <h2 className="font-semibold mb-3">Every tracker over time</h2>
          {seriesData.length > 1 ? (
            <LineTrend
              data={seriesData}
              series={[
                { key: "composite", name: "Life Score", color: "var(--primary)" },
                ...seriesTrackers.map((t: any) => ({ key: t.id, name: t.name, color: trackerColor(t.color) })),
              ]}
              height={300}
            />
          ) : (
            <div className="h-[260px] grid place-items-center text-sm text-muted-foreground">Not enough history yet.</div>
          )}
        </BentoCard>

        {/* Composite area */}
        <BentoCard className="col-span-2" delay={0.05}>
          <h2 className="font-semibold mb-3">Composite Life Score</h2>
          {seriesData.length > 1 ? (
            <AreaTrend data={seriesData} dataKey="composite" name="Life Score" color="var(--primary)" height={220} />
          ) : (
            <div className="h-[200px] grid place-items-center text-sm text-muted-foreground">Not enough history yet.</div>
          )}
        </BentoCard>

        {/* Balance radar */}
        <BentoCard className="col-span-2" delay={0.07}>
          <h2 className="font-semibold mb-1">Current balance</h2>
          {radarData.length >= 3 ? (
            <RadarScores data={radarData} height={220} />
          ) : (
            <div className="h-[200px] grid place-items-center text-center text-sm text-muted-foreground px-6">Log a few more trackers to see your balance.</div>
          )}
        </BentoCard>
      </div>

      {/* Per-tracker small multiples */}
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">By tracker</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {seriesTrackers.map((t: any, i: number) => (
            <BentoCard key={t.id} delay={0.04 + i * 0.03}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">{t.name}</h3>
                <Link href={`/trackers/${t.id}`} className="text-xs text-muted-foreground hover:text-foreground">Open</Link>
              </div>
              <AreaTrend data={seriesData} dataKey={t.id} name={t.name} color={trackerColor(t.color)} height={130} />
            </BentoCard>
          ))}
        </div>
      </div>
    </div>
  );
}
