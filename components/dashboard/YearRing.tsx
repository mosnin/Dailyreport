"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Flame } from "lucide-react";
import { format } from "date-fns";
import { motion } from "motion/react";

function Skeleton() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-[140px] h-[140px] rounded-full bg-muted/40 animate-pulse" />
    </div>
  );
}

export function YearRing({
  userId,
  streak,
  createdAt,
}: {
  userId: Id<"users">;
  streak: number;
  createdAt?: number;
}) {
  const year = new Date().getFullYear();
  const today = format(new Date(), "yyyy-MM-dd");

  const submittedDates = useQuery(api.reports.getYearSubmissions, { userId, year });

  if (submittedDates === undefined) return <Skeleton />;

  const yearStart = new Date(`${year}-01-01T12:00:00`);
  // Start accuracy from account creation if it's within this year — so a new
  // user sees their actual consistency rate, not a demoralising fraction of 365.
  const journeyStart =
    createdAt && createdAt > yearStart.getTime()
      ? new Date(new Date(createdAt).setHours(12, 0, 0, 0))
      : yearStart;

  const todayDate = new Date(today + "T12:00:00");
  // Only count days that have fully passed + today-if-submitted. Exclude future.
  const daysElapsed = Math.max(
    1,
    Math.round((todayDate.getTime() - journeyStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );

  const doneCount = submittedDates.length;
  const accuracy = Math.min(100, Math.round((doneCount / daysElapsed) * 100));

  // Motivational qualifier
  const qualifier =
    daysElapsed <= 7 && accuracy === 100
      ? "Perfect start."
      : accuracy >= 85
      ? "Exceptional."
      : accuracy >= 70
      ? "On track."
      : accuracy >= 50
      ? "Building."
      : daysElapsed <= 14
      ? "Just getting started."
      : "Keep going.";

  // Label: "since April" if joined mid-year, else the year
  const sinceLabel =
    createdAt && createdAt > yearStart.getTime()
      ? `since ${format(new Date(createdAt), "MMM d")}`
      : String(year);

  const R = 58;
  const CX = 70;
  const CY = 70;
  const circumference = 2 * Math.PI * R;
  const strokeOffset = circumference * (1 - accuracy / 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative shrink-0">
        <svg
          width="140"
          height="140"
          viewBox="0 0 140 140"
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Track */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            strokeWidth="10"
            className="stroke-muted"
          />
          {/* Progress arc */}
          <motion.circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            strokeWidth="10"
            className="stroke-primary"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: strokeOffset }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <motion.span
            className="font-heading text-[1.6rem] font-bold tabular-nums leading-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {accuracy}%
          </motion.span>
          <span className="text-[10px] text-muted-foreground/50 mt-1 tracking-wide">
            {sinceLabel}
          </span>
        </div>
      </div>

      {/* Qualifier + streak */}
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.55 }}
        className="flex flex-col items-center gap-1"
      >
        <span className="text-[11px] text-muted-foreground/50 italic">{qualifier}</span>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-500">
            <Flame className="w-3.5 h-3.5" />
            {streak}d streak
          </div>
        )}
      </motion.div>
    </div>
  );
}
