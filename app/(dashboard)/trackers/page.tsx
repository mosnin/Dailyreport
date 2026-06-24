"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { BentoCard } from "@/components/bento/BentoCard";
import { PageHeader } from "@/components/bento/PageHeader";
import { TrackerCreator } from "@/components/trackers/TrackerCreator";
import { trackerColor, scoreLabel } from "@/lib/trackers";

export default function TrackersPage() {
  const { convexUserId } = useConvexUser();
  const overview = useQuery(api.trackers.getOverview, convexUserId ? { userId: convexUserId } : "skip");
  const trackers = overview?.trackers ?? [];

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        eyebrow="Trackers"
        title="Measure anything"
        subtitle="Describe what you want to track and AI builds the log, the scoring and the charts."
      />

      <BentoCard delay={0.02}>
        <h2 className="font-semibold mb-1">Create a tracker</h2>
        <p className="text-sm text-muted-foreground mb-3">Pick a template or tell the AI what you care about. Refine before saving.</p>
        {convexUserId && <TrackerCreator userId={convexUserId} />}
      </BentoCard>

      {overview === undefined ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-3xl" />)}
        </div>
      ) : trackers.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {trackers.map((t: any, i: number) => {
            const color = trackerColor(t.color);
            return (
              <BentoCard key={t._id} href={`/trackers/${t._id}`} className="flex flex-col gap-3" delay={0.04 + i * 0.03}>
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl text-lg" style={{ background: color }}>{t.emoji}</span>
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
                  <p className="text-xs text-muted-foreground mt-0.5">{t.needsData ? "No data yet" : scoreLabel(t.score)}</p>
                </div>
              </BentoCard>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
