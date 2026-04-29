"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { Star, Eye, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const AFFIRMATION_GOAL = 5;

function PracticeCard({
  href,
  icon: Icon,
  iconColor,
  label,
  value,
  subtext,
  progress,
  done,
}: {
  href: string;
  icon: React.ElementType;
  iconColor: string;
  label: string;
  value: string;
  subtext: string;
  progress: number;
  done: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group rounded-2xl border p-4 flex flex-col gap-3 transition-colors hover:bg-accent/40",
        done
          ? "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/10"
          : "border-border bg-card"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", iconColor)} />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {label}
          </span>
        </div>
        {done ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        )}
      </div>

      <div>
        <div className="text-2xl font-bold tabular-nums leading-none mb-0.5">
          {value}
        </div>
        <div className="text-xs text-muted-foreground">{subtext}</div>
      </div>

      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            done ? "bg-emerald-400" : iconColor.includes("amber") ? "bg-amber-400" : "bg-sky-400"
          )}
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </div>
    </Link>
  );
}

export function TodayPractice({ userId }: { userId: Id<"users"> }) {
  const todayStr = new Date().toISOString().split("T")[0];

  const session = useQuery(api.affirmations.getTodaySession, { userId, date: todayStr });
  const viz = useQuery(api.visualizations.getForDate, { userId, date: todayStr });

  const rounds = session?.rounds ?? 0;
  const affirmDone = rounds >= AFFIRMATION_GOAL;

  const vizCompleted = viz?.completedIndexes.length ?? 0;
  const vizTotal = viz?.scenarios.length ?? 10;
  const vizDone = vizCompleted > 0 && vizCompleted >= vizTotal;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
        Today&apos;s Practice
      </h2>
      <div className="grid grid-cols-2 gap-3">
        <PracticeCard
          href="/affirmations"
          icon={Star}
          iconColor="text-amber-500"
          label="Affirmations"
          value={`${rounds}/${AFFIRMATION_GOAL}`}
          subtext={affirmDone ? "Goal met" : "rounds today"}
          progress={rounds / AFFIRMATION_GOAL}
          done={affirmDone}
        />
        <PracticeCard
          href="/dreams"
          icon={Eye}
          iconColor="text-sky-500"
          label="Visualizations"
          value={`${vizCompleted}/${vizTotal}`}
          subtext={vizDone ? "All complete" : "done today"}
          progress={vizTotal > 0 ? vizCompleted / vizTotal : 0}
          done={vizDone}
        />
      </div>
    </div>
  );
}
