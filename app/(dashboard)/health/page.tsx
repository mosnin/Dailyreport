"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/bento/PageHeader";
import { BentoCard } from "@/components/bento/BentoCard";
import { ScoreRing } from "@/components/bento/ScoreRing";
import { Skeleton } from "@/components/ui/skeleton";
import { LineTrend, AreaTrend, ScatterPlot } from "@/components/charts/Charts";
import { scoreLabel } from "@/lib/areas";

const ACCENT = "var(--health)";
const SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60";

function LogTodayLink() {
  return (
    <Link
      href="/reports/health"
      className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-[oklch(0.2_0.03_264)]"
      style={{ background: ACCENT }}
    >
      Log today
    </Link>
  );
}

function avg(values: (number | undefined | null)[]): number | null {
  const nums = values.filter((v): v is number => typeof v === "number");
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function NotEnoughData() {
  return (
    <p className="text-sm text-muted-foreground/70 py-8 text-center">
      Not enough data yet
    </p>
  );
}

function StatTile({
  label,
  value,
  suffix,
  delay,
}: {
  label: string;
  value: string;
  suffix?: string;
  delay?: number;
}) {
  return (
    <BentoCard className="flex flex-col justify-between" delay={delay}>
      <p className={SECTION_LABEL}>{label}</p>
      <p className="text-2xl font-bold numeral mt-3">
        {value}
        {suffix && (
          <span className="text-sm font-medium text-muted-foreground ml-1">
            {suffix}
          </span>
        )}
      </p>
    </BentoCard>
  );
}

export default function HealthAnalyticsPage() {
  const { convexUserId } = useConvexUser();

  const rows = useQuery(
    api.health.getRecent,
    convexUserId ? { userId: convexUserId, days: 60 } : "skip"
  ) as any[] | undefined;

  const lifeScore = useQuery(
    api.lifeScore.getCurrent,
    convexUserId ? { userId: convexUserId, windowDays: 60 } : "skip"
  );

  const header = (
    <PageHeader
      eyebrow="Life domain"
      title="Health"
      subtitle="Trends across sleep, movement, nutrition and energy."
      action={<LogTodayLink />}
    />
  );

  // Loading.
  if (!convexUserId || rows === undefined) {
    return (
      <div className="space-y-4 pb-6">
        {header}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Skeleton className="col-span-2 lg:col-span-1 h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="col-span-2 lg:col-span-2 h-72 rounded-3xl" />
          <Skeleton className="col-span-2 lg:col-span-2 h-72 rounded-3xl" />
        </div>
      </div>
    );
  }

  // Empty.
  if (rows.length === 0) {
    return (
      <div className="space-y-4 pb-6">
        {header}
        <BentoCard className="flex flex-col items-center justify-center text-center py-16 gap-4">
          <p className="text-base font-semibold">No health logs yet</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Start logging your sleep, movement, nutrition and mood to see your
            trends build over time.
          </p>
          <LogTodayLink />
        </BentoCard>
      </div>
    );
  }

  const healthArea: any = (lifeScore as any)?.areas?.find(
    (a: any) => a.key === "health"
  );
  const hasScore = !!healthArea && !healthArea.needsData;

  const avgSleep = avg(rows.map((r) => r.sleepHours));
  const avgExercise = avg(rows.map((r) => r.exerciseMinutes));
  const avgMood = avg(rows.map((r) => r.mood));

  const chartData = rows.map((r) => ({
    label: new Date(r.date + "T12:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    sleepHours: r.sleepHours,
    mood: r.mood,
    energy: r.energy,
    exerciseMinutes: r.exerciseMinutes,
  }));

  const sleepData = chartData.filter((d) => typeof d.sleepHours === "number");
  const moodEnergyData = chartData.filter(
    (d) => typeof d.mood === "number" || typeof d.energy === "number"
  );
  const exerciseData = chartData.filter(
    (d) => typeof d.exerciseMinutes === "number"
  );
  const maxMinutes = Math.max(
    0,
    ...rows.map((r) => (typeof r.exerciseMinutes === "number" ? r.exerciseMinutes : 0))
  );

  const scatterData = rows
    .filter(
      (r) => typeof r.sleepHours === "number" && typeof r.mood === "number"
    )
    .map((r) => ({ sleepHours: r.sleepHours, mood: r.mood }));

  return (
    <div className="space-y-4 pb-6">
      {header}

      {/* Top row: score + stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <BentoCard
          className="col-span-2 lg:col-span-1 flex flex-col items-center justify-center text-center"
          delay={0.02}
        >
          <p className={SECTION_LABEL}>Health score</p>
          {hasScore ? (
            <>
              <div className="my-3">
                <ScoreRing value={healthArea.score} color={ACCENT} size={112}>
                  <div className="text-center">
                    <p className="text-2xl font-bold numeral text-foreground">
                      {Math.round(healthArea.score)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">/ 100</p>
                  </div>
                </ScoreRing>
              </div>
              <p className="text-sm font-semibold">{scoreLabel(healthArea.score)}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-4">
              Log more days to unlock your score.
            </p>
          )}
        </BentoCard>

        <StatTile
          label="Avg sleep"
          value={avgSleep != null ? avgSleep.toFixed(1) : "-"}
          suffix={avgSleep != null ? "hrs" : undefined}
          delay={0.04}
        />
        <StatTile
          label="Avg exercise"
          value={avgExercise != null ? Math.round(avgExercise).toString() : "-"}
          suffix={avgExercise != null ? "min" : undefined}
          delay={0.06}
        />
        <StatTile
          label="Avg mood"
          value={avgMood != null ? avgMood.toFixed(1) : "-"}
          suffix={avgMood != null ? "/ 10" : undefined}
          delay={0.08}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <BentoCard className="col-span-2 lg:col-span-2" delay={0.1}>
          <p className={SECTION_LABEL}>Sleep</p>
          <h2 className="font-semibold mt-1 mb-3">Hours per night</h2>
          {sleepData.length >= 2 ? (
            <AreaTrend
              data={sleepData}
              dataKey="sleepHours"
              name="Sleep"
              color="var(--progress)"
              domain={[0, 12]}
              suffix="h"
            />
          ) : (
            <NotEnoughData />
          )}
        </BentoCard>

        <BentoCard className="col-span-2 lg:col-span-2" delay={0.12}>
          <p className={SECTION_LABEL}>Mood &amp; energy</p>
          <h2 className="font-semibold mt-1 mb-3">Daily 1-10</h2>
          {moodEnergyData.length >= 2 ? (
            <LineTrend
              data={moodEnergyData}
              series={[
                { key: "mood", name: "Mood", color: "var(--emotional)" },
                { key: "energy", name: "Energy", color: "var(--health)" },
              ]}
              domain={[0, 10]}
            />
          ) : (
            <NotEnoughData />
          )}
        </BentoCard>

        <BentoCard className="col-span-2 lg:col-span-2" delay={0.14}>
          <p className={SECTION_LABEL}>Movement</p>
          <h2 className="font-semibold mt-1 mb-3">Exercise minutes</h2>
          {exerciseData.length >= 2 ? (
            <AreaTrend
              data={exerciseData}
              dataKey="exerciseMinutes"
              name="Exercise"
              color="var(--health)"
              domain={[0, Math.max(60, maxMinutes)]}
              suffix="m"
            />
          ) : (
            <NotEnoughData />
          )}
        </BentoCard>

        <BentoCard className="col-span-2 lg:col-span-2" delay={0.16}>
          <p className={SECTION_LABEL}>Correlation</p>
          <h2 className="font-semibold mt-1 mb-3">Sleep vs mood</h2>
          {scatterData.length >= 2 ? (
            <ScatterPlot
              data={scatterData}
              xKey="sleepHours"
              yKey="mood"
              xName="Sleep (hrs)"
              yName="Mood"
              color="var(--emotional)"
              xDomain={[0, 12]}
              yDomain={[0, 10]}
            />
          ) : (
            <NotEnoughData />
          )}
        </BentoCard>
      </div>
    </div>
  );
}
