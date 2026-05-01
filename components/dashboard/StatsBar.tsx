"use client";

import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, BarChart3, CalendarDays } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { listVariants, itemVariants } from "@/lib/motion";

function CountUp({
  to,
  suffix = "",
  duration = 0.9,
  delay = 0,
}: {
  to: number;
  suffix?: string;
  duration?: number;
  delay?: number;
}) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => `${Math.round(v)}${suffix}`);

  useEffect(() => {
    const controls = animate(count, to, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [count, to, duration, delay]);

  return <motion.span>{rounded}</motion.span>;
}

function parseValue(value: string): { number: number; suffix: string } {
  if (value.endsWith("%")) {
    return { number: parseInt(value.slice(0, -1), 10), suffix: "%" };
  }
  if (value.endsWith("d")) {
    return { number: parseInt(value.slice(0, -1), 10), suffix: "d" };
  }
  return { number: parseInt(value, 10), suffix: "" };
}

export function StatsBar({ userId, compact = false }: { userId: Id<"users">; compact?: boolean }) {
  const stats = useQuery(api.users.getStats, { userId });

  if (!stats) {
    if (compact) {
      return (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-10" />
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-card p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (compact) {
    return (
      <motion.div
        className="rounded-2xl border border-border bg-card p-4 space-y-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <CompactRow icon={Flame}        label="Current streak"  value={`${stats.streak}d`}               color="text-orange-500"  bg="bg-orange-500/10" delay={0} />
        <CompactRow icon={BarChart3}    label="Daily accuracy"  value={`${stats.dailyAccuracy}%`}         color="text-primary"     bg="bg-primary/10"    delay={0.08} />
        <CompactRow icon={CalendarDays} label="Weekly accuracy" value={`${stats.weeklyAccuracy}%`}        color="text-emerald-500" bg="bg-emerald-500/10" delay={0.16} />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      initial="hidden"
      animate="visible"
      variants={listVariants}
    >
      <StatCard icon={Flame}        label="Current streak"  value={`${stats.streak}d`}               color="text-orange-500"  bg="bg-orange-500/10" delay={0} />
      <StatCard icon={BarChart3}    label="Daily accuracy"  value={`${stats.dailyAccuracy}%`}         color="text-primary"     bg="bg-primary/10"    delay={0.08} />
      <StatCard icon={CalendarDays} label="Weekly accuracy" value={`${stats.weeklyAccuracy}%`}        color="text-emerald-500" bg="bg-emerald-500/10" delay={0.16} />
    </motion.div>
  );
}

function CompactRow({
  icon: Icon,
  label,
  value,
  color,
  bg,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  bg: string;
  delay?: number;
}) {
  const { number, suffix } = parseValue(value);
  return (
    <div className="flex items-center gap-3">
      <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
      </div>
      <span className="flex-1 text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${color}`}>
        <CountUp to={number} suffix={suffix} delay={delay} />
      </span>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  bg: string;
  delay?: number;
}) {
  const { number, suffix } = parseValue(value);
  return (
    <motion.div
      variants={itemVariants}
      className="rounded-2xl border border-border bg-card p-4 flex items-center gap-4"
    >
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold leading-tight">
          <CountUp to={number} suffix={suffix} delay={delay} />
        </div>
      </div>
    </motion.div>
  );
}
