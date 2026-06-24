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
import { TrackerCreator } from "@/components/trackers/TrackerCreator";
import { trackerColor, scoreLabel } from "@/lib/trackers";
import { Flame } from "lucide-react";
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
        <BentoCard delay={0.04}>
          <h2 className="font-semibold mb-1">Build your dashboard</h2>
          <p className="text-sm text-muted-foreground mb-3">Create a tracker and this whole page organizes around it.</p>
          {convexUserId && <TrackerCreator userId={convexUserId} />}
        </BentoCard>
        {convexUserId && <TimezoneModal userId={convexUserId} open={showTz} onClose={() => setShowTz(false)} />}
      </div>
    );
  }

  const radarData = trackers.filter((t: any) => !t.needsData).map((t: any) => ({ area: t.name, score: t.score }));
  const lineSeries = (series?.trackers ?? []).slice(0, 6).map((t: any) => ({ key: t.id, name: t.name, color: trackerColor(t.color) }));

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        eyebrow="Overview"
        title="Your Life Score"
        subtitle="A weighted score across everything you track."
        action={<Link href="/analytics" className="hidden sm:inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-medium hover:bg-accent/70">Analytics</Link>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Composite */}
        <BentoCard className="col-span-2 flex items-center gap-5" delay={0.02}>
          <ScoreRing value={overview?.composite ?? 0} color="var(--primary)" size={120} stroke={11}>
            <div className="text-center">
              <div className="text-3xl font-bold numeral leading-none">{overview?.hasScored ? overview.credit : "-"}</div>
              <div className="text-[10px] uppercase tracking-wide mt-1 text-muted-foreground">/ 850</div>
            </div>
          </ScoreRing>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Composite</p>
            <p className="text-2xl font-bold mt-0.5">{overview?.hasScored ? creditLabel(overview.credit) : "No data yet"}</p>
            <p className="text-sm mt-1 text-muted-foreground">Across {trackers.length} tracker{trackers.length === 1 ? "" : "s"}</p>
          </div>
        </BentoCard>

        {/* Balance radar */}
        <BentoCard className="col-span-2 lg:row-span-2" delay={0.04}>
          <h2 className="font-semibold mb-1">Balance</h2>
          <p className="text-xs text-muted-foreground mb-2">How evenly you&apos;re investing across trackers</p>
          {radarData.length >= 3 ? (
            <RadarScores data={radarData} height={260} />
          ) : (
            <div className="h-[260px] grid place-items-center text-center text-sm text-muted-foreground px-6">Log a few more trackers to unlock your balance chart.</div>
          )}
        </BentoCard>

        {/* Tracker tiles */}
        {trackers.map((t: any, i: number) => (
          <BentoCard key={t._id} href={`/trackers/${t._id}`} className="flex flex-col gap-3" delay={0.04 + i * 0.03}>
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl text-base" style={{ background: trackerColor(t.color) }}>{t.emoji}</span>
              {!t.needsData && t.trend !== 0 && (
                <span className={`text-xs font-medium ${t.trend > 0 ? "text-emerald-400" : "text-rose-400"}`}>{t.trend > 0 ? "+" : ""}{t.trend}</span>
              )}
            </div>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold numeral">{t.needsData ? "-" : t.score}</span>
                {!t.needsData && <span className="text-xs text-muted-foreground">/ 100</span>}
              </div>
              <p className="text-sm font-medium mt-0.5 truncate">{t.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground">{t.needsData ? "No data yet" : scoreLabel(t.score)}</p>
                {t.streak > 1 && (
                  <span className="flex items-center gap-0.5 text-xs text-muted-foreground numeral">
                    <Flame className="h-3 w-3" style={{ color: trackerColor(t.color) }} />
                    {t.streak}
                  </span>
                )}
              </div>
            </div>
          </BentoCard>
        ))}
      </div>

      {/* Over time */}
      <BentoCard delay={0.1}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-semibold">Life Score over time</h2>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </div>
          <Link href="/analytics" className="text-xs text-muted-foreground hover:text-foreground">Compare trackers</Link>
        </div>
        {series && series.series.length > 0 ? (
          <LineTrend data={series.series} series={[{ key: "composite", name: "Life Score", color: "var(--primary)" }, ...lineSeries]} height={240} />
        ) : (
          <div className="h-[220px] grid place-items-center text-sm text-muted-foreground">Not enough history yet.</div>
        )}
      </BentoCard>

      {convexUserId && <TimezoneModal userId={convexUserId} open={showTz} onClose={() => setShowTz(false)} />}
    </div>
  );
}
