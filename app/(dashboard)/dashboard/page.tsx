"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { BentoCard } from "@/components/bento/BentoCard";
import { ScoreRing } from "@/components/bento/ScoreRing";
import { PageHeader } from "@/components/bento/PageHeader";
import { LineTrend, AreaTrend, RadarScores } from "@/components/charts/Charts";
import { TimezoneModal } from "@/components/dashboard/TimezoneModal";
import { TrackerCreator } from "@/components/trackers/TrackerCreator";
import { QuickStartDailyReport } from "@/components/trackers/QuickStart";
import { TrackerMark } from "@/components/trackers/TrackerMark";
import { trackerColor, scoreLabel } from "@/lib/trackers";
import Link from "next/link";

function creditLabel(credit: number): string {
  if (credit >= 800) return "Exceptional";
  if (credit >= 740) return "Very good";
  if (credit >= 670) return "Good";
  if (credit >= 580) return "Fair";
  return "Building";
}

export default function DashboardPage() {
  const { convexUserId, convexUser } = useConvexUser();
  const [showTz, setShowTz] = useState(false);
  const overview = useQuery(api.trackers.getOverview, convexUserId ? { userId: convexUserId } : "skip");
  const series = useQuery(api.trackers.getSeries, convexUserId ? { userId: convexUserId, days: 30 } : "skip");

  useEffect(() => {
    if (convexUser && !convexUser.timezone) setShowTz(true);
  }, [convexUser]);

  if (!convexUserId || overview === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  const trackers = overview?.trackers ?? [];

  if (trackers.length === 0) {
    return (
      <div className="space-y-4 pb-6">
        <PageHeader eyebrow="Overview" title="Your Life Score" subtitle="Set up what you measure and your score appears here." />
        <BentoCard delay={0.03}>
          <h2 className="font-semibold mb-1">Start in one tap</h2>
          <p className="text-sm text-muted-foreground mb-3">The built-in Daily Report gives you a score out of the box.</p>
          {convexUserId && <QuickStartDailyReport userId={convexUserId} />}
        </BentoCard>
        <BentoCard delay={0.05}>
          <h2 className="font-semibold mb-1">Or build your own</h2>
          <p className="text-sm text-muted-foreground mb-3">Describe what you want to track. The AI designs it and this whole page organizes around it.</p>
          {convexUserId && <TrackerCreator userId={convexUserId} />}
        </BentoCard>
        {convexUserId && <TimezoneModal userId={convexUserId} open={showTz} onClose={() => setShowTz(false)} />}
      </div>
    );
  }

  const composite = overview?.composite ?? 0;
  const hasScored = overview?.hasScored ?? false;
  const radarData = trackers.filter((t: any) => !t.needsData).map((t: any) => ({ area: t.name, score: t.score }));
  const lineSeries = (series?.trackers ?? []).slice(0, 6).map((t: any) => ({ key: t.id, name: t.name, color: trackerColor(t.color) }));
  const ranked = [...trackers].sort((a: any, b: any) => {
    if (a.needsData !== b.needsData) return a.needsData ? 1 : -1;
    return b.score - a.score;
  });

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        eyebrow="Overview"
        title="Your Life Score"
        subtitle="A single weighted score across everything you track."
        action={<Link href="/analytics" className="hidden sm:inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-medium hover:bg-accent/70">Analytics</Link>}
      />

      {/* Hero: composite score + 30-day movement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <BentoCard className="lg:col-span-1 flex items-center gap-5" delay={0.02}>
          <ScoreRing value={composite} color="var(--primary)" size={128} stroke={12}>
            <div className="text-center">
              <div className="text-3xl font-bold numeral leading-none">{hasScored ? overview?.credit : "-"}</div>
              <div className="text-[10px] uppercase tracking-wide mt-1 text-muted-foreground">/ 850</div>
            </div>
          </ScoreRing>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Composite</p>
            <p className="text-2xl font-bold mt-0.5 leading-tight">{hasScored ? creditLabel(overview?.credit ?? 0) : "No data yet"}</p>
            <p className="text-sm mt-1 text-muted-foreground">{hasScored ? `${composite}/100 across ${trackers.length} tracker${trackers.length === 1 ? "" : "s"}` : `${trackers.length} tracker${trackers.length === 1 ? "" : "s"} set up`}</p>
          </div>
        </BentoCard>

        <BentoCard className="lg:col-span-2 flex flex-col" delay={0.04}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Last 30 days</h2>
            <Link href="/analytics" className="text-xs text-muted-foreground hover:text-foreground">Details</Link>
          </div>
          {series && series.series.length > 1 ? (
            <AreaTrend data={series.series} dataKey="composite" name="Life Score" color="var(--primary)" height={150} />
          ) : (
            <div className="flex-1 grid place-items-center text-sm text-muted-foreground min-h-[140px]">Not enough history yet.</div>
          )}
        </BentoCard>
      </div>

      {/* Trackers: ranked list with score bars */}
      <BentoCard delay={0.06}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Trackers</h2>
          <Link href="/trackers" className="text-xs text-muted-foreground hover:text-foreground">Manage</Link>
        </div>
        <div className="divide-y divide-border/40">
          {ranked.map((t: any) => {
            const color = trackerColor(t.color);
            return (
              <Link key={t._id} href={`/trackers/${t._id}`} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0 group">
                <TrackerMark name={t.name} color={t.color} size={38} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium truncate group-hover:text-foreground">{t.name}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {!t.needsData && t.trend !== 0 && (
                        <span className={`text-xs font-medium ${t.trend > 0 ? "text-emerald-400" : "text-rose-400"}`}>{t.trend > 0 ? "+" : ""}{t.trend}</span>
                      )}
                      <span className="text-sm font-bold numeral w-8 text-right">{t.needsData ? "-" : t.score}</span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${t.needsData ? 0 : t.score}%`, background: color }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground w-20 shrink-0">{t.needsData ? "No data yet" : scoreLabel(t.score)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </BentoCard>

      {/* Balance + per-tracker movement */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
        <BentoCard className="lg:col-span-2" delay={0.08}>
          <h2 className="font-semibold mb-1">Balance</h2>
          <p className="text-xs text-muted-foreground mb-2">How evenly you are investing across trackers</p>
          {radarData.length >= 3 ? (
            <RadarScores data={radarData} height={240} />
          ) : (
            <div className="h-[240px] grid place-items-center text-center text-sm text-muted-foreground px-6">Log a few more trackers to unlock your balance chart.</div>
          )}
        </BentoCard>

        <BentoCard className="lg:col-span-3" delay={0.1}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Every tracker over time</h2>
            <Link href="/analytics" className="text-xs text-muted-foreground hover:text-foreground">Compare</Link>
          </div>
          {series && series.series.length > 1 ? (
            <LineTrend data={series.series} series={[{ key: "composite", name: "Life Score", color: "var(--primary)" }, ...lineSeries]} height={240} />
          ) : (
            <div className="h-[220px] grid place-items-center text-sm text-muted-foreground">Not enough history yet.</div>
          )}
        </BentoCard>
      </div>

      {convexUserId && <TimezoneModal userId={convexUserId} open={showTz} onClose={() => setShowTz(false)} />}
    </div>
  );
}
