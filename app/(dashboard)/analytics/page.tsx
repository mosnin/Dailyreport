"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  LineChart as LineChartIcon,
  Target,
  AlertOctagon,
  Users,
  Brain,
  NotepadText,
  Flame,
  Telescope,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────

type GoalKey = "yearly" | "quarterly" | "monthly" | "weekly";

// ── Range selector ────────────────────────────────────────────────────────

const RANGE_OPTIONS = [
  { label: "8w", weeks: 8 },
  { label: "12w", weeks: 12 },
  { label: "24w", weeks: 24 },
];

function RangeSelector({
  weeks,
  onChange,
}: {
  weeks: number;
  onChange: (w: number) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-border p-0.5">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.weeks}
          onClick={() => onChange(opt.weeks)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
            weeks === opt.weeks
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  iconClass,
  children,
}: {
  title: string;
  icon: React.ElementType;
  iconClass?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Icon className={cn("w-5 h-5", iconClass ?? "text-primary")} />
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

// ── Practice consistency tooltip ──────────────────────────────────────────

function PracticeTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card shadow-lg px-3 py-2.5 text-xs space-y-1.5 min-w-[140px]">
      <p className="font-semibold text-foreground">Week of {label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground capitalize">{entry.name}</span>
          <span className="font-medium tabular-nums" style={{ color: entry.fill }}>
            {entry.value}d
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Goal progress bar ─────────────────────────────────────────────────────

function GoalBar({
  label,
  total,
  completed,
  periodKey,
}: {
  label: string;
  total: number;
  completed: number;
  periodKey: string;
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums text-xs">
          {completed}/{total}
          {total > 0 && (
            <span className="ml-1.5 font-semibold text-foreground">{pct}%</span>
          )}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct === 100
              ? "bg-emerald-500"
              : pct >= 60
              ? "bg-primary"
              : pct >= 30
              ? "bg-amber-500"
              : "bg-muted-foreground/30"
          )}
          style={{ width: total > 0 ? `${pct}%` : "0%" }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground/60">{periodKey}</p>
    </div>
  );
}

// ── Horizontal bar row ────────────────────────────────────────────────────

function HBarRow({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-right text-muted-foreground truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="w-6 text-xs tabular-nums text-muted-foreground">{count}</span>
    </div>
  );
}

// ── Stat tile ─────────────────────────────────────────────────────────────

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-3xl font-bold tabular-nums", accent)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { convexUserId, isLoading } = useConvexUser();
  const [weeks, setWeeks] = useState(12);

  const data = useQuery(
    api.analytics.getAnalytics,
    convexUserId ? { userId: convexUserId, weeks } : "skip"
  );

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-3xl space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-3xl space-y-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const goalOrder: GoalKey[] = ["yearly", "quarterly", "monthly", "weekly"];
  const goalLabels: Record<GoalKey, string> = {
    yearly: "Yearly",
    quarterly: "Quarterly",
    monthly: "Monthly",
    weekly: "Weekly",
  };

  const drainMax = data.topDrainThemes[0]?.count ?? 1;
  const peopleMax = data.topPeople[0]?.count ?? 1;

  return (
    <div className="max-w-3xl space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <LineChartIcon className="w-6 h-6 text-primary" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your progress over time — reports, practices, goals, and patterns.
          </p>
        </div>
        <RangeSelector weeks={weeks} onChange={setWeeks} />
      </div>

      {/* Summary stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile
          label="Total reports"
          value={data.totalDailyReports}
          sub="daily submissions"
        />
        <StatTile
          label="Goals completed"
          value={data.allTimeGoals.completed}
          sub={`of ${data.allTimeGoals.total} total`}
          accent="text-emerald-600 dark:text-emerald-400"
        />
        <StatTile
          label="Problems resolved"
          value={`${data.problemStats.resolutionRate}%`}
          sub={`${data.problemStats.resolved}/${data.problemStats.total} problems`}
          accent={
            data.problemStats.resolutionRate >= 70
              ? "text-emerald-600 dark:text-emerald-400"
              : data.problemStats.resolutionRate >= 40
              ? "text-amber-600 dark:text-amber-400"
              : undefined
          }
        />
        <StatTile
          label="People mentioned"
          value={data.topPeople.length}
          sub="unique connections"
          accent="text-sky-600 dark:text-sky-400"
        />
      </div>

      {/* Practice consistency */}
      <Section title="Practice Consistency" icon={NotepadText} iconClass="text-emerald-500">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground mb-4">
            Days per week each practice was completed
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={data.weeklyData}
              margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
              barSize={8}
              barCategoryGap="30%"
            >
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
                interval={weeks <= 8 ? 0 : Math.floor(weeks / 8)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "currentColor", opacity: 0.45 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                domain={[0, 7]}
                ticks={[0, 2, 4, 6, 7]}
              />
              <Tooltip content={<PracticeTooltip />} cursor={{ fill: "currentColor", fillOpacity: 0.03 }} />
              <Legend
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              <Bar dataKey="reports" name="Reports" fill="#22c55e" radius={[2, 2, 0, 0]} />
              <Bar dataKey="affirmations" name="Affirmations" fill="#f59e0b" radius={[2, 2, 0, 0]} />
              <Bar dataKey="visualizations" name="Visualizations" fill="#0ea5e9" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      <div className="border-t border-border" />

      {/* Goals by category */}
      <Section title="Goal Completion" icon={Target} iconClass="text-violet-500">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
          {goalOrder.map((cat) => {
            const s = data.goalStats[cat];
            if (!s) return null;
            return (
              <GoalBar
                key={cat}
                label={goalLabels[cat]}
                total={s.total}
                completed={s.completed}
                periodKey={s.periodKey}
              />
            );
          })}
          {goalOrder.every((c) => (data.goalStats[c]?.total ?? 0) === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No goals set yet. Add some in the Goals page.
            </p>
          )}
        </div>
      </Section>

      <div className="border-t border-border" />

      {/* Problem stats */}
      <Section title="Problem Tracker" icon={AlertOctagon} iconClass="text-rose-500">
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Total logged" value={data.problemStats.total} />
          <StatTile
            label="Still open"
            value={data.problemStats.open}
            accent={data.problemStats.open > 5 ? "text-rose-500" : undefined}
          />
          <StatTile
            label="Resolved"
            value={data.problemStats.resolved}
            accent="text-emerald-600 dark:text-emerald-400"
          />
        </div>
        {data.problemStats.total === 0 && (
          <p className="text-sm text-muted-foreground">No problems logged yet.</p>
        )}
      </Section>

      <div className="border-t border-border" />

      {/* Emotional drain themes */}
      <Section title="Emotional Drain Patterns" icon={Brain} iconClass="text-amber-500">
        <div className="rounded-2xl border border-border bg-card p-5">
          {data.topDrainThemes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Fill in the &ldquo;emotional drain&rdquo; field in daily reports to see patterns here.
            </p>
          ) : (
            <div className="space-y-2.5">
              {data.topDrainThemes.map((entry: { word: string; count: number }) => (
                <HBarRow
                  key={entry.word}
                  label={entry.word}
                  count={entry.count}
                  max={drainMax}
                  color="#f59e0b"
                />
              ))}
            </div>
          )}
        </div>
        {data.topDrainThemes.length > 0 && (
          <p className="text-xs text-muted-foreground/60">
            Most frequent words in your daily emotional drain entries. Use this to spot recurring stressors.
          </p>
        )}
      </Section>

      <div className="border-t border-border" />

      {/* People network */}
      <Section title="Your Network" icon={Users} iconClass="text-sky-500">
        <div className="rounded-2xl border border-border bg-card p-5 pb-6">
          {data.topPeople.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              Log people you meet in daily reports to see who you interact with most.
            </p>
          ) : (
            <div className="space-y-2.5">
              {data.topPeople.map((entry: { name: string; count: number }) => (
                <HBarRow
                  key={entry.name}
                  label={entry.name}
                  count={entry.count}
                  max={peopleMax}
                  color="#0ea5e9"
                />
              ))}
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
