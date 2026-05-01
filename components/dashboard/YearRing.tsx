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
}: {
  userId: Id<"users">;
  streak: number;
}) {
  const year = new Date().getFullYear();
  const today = format(new Date(), "yyyy-MM-dd");

  const submittedDates = useQuery(api.reports.getYearSubmissions, { userId, year });

  if (submittedDates === undefined) return <Skeleton />;

  const yearStart = new Date(`${year}-01-01T12:00:00`);
  const todayDate = new Date(today + "T12:00:00");
  const dayOfYear = Math.max(
    1,
    Math.round((todayDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24))
  );

  const doneCount = submittedDates.length;
  const elapsed = dayOfYear + 1;
  const accuracy = Math.round((doneCount / elapsed) * 100);

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
            {year}
          </span>
        </div>
      </div>

      {/* Streak badge — sits below ring */}
      {streak > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.55 }}
          className="flex items-center gap-1.5 text-xs font-semibold text-orange-500"
        >
          <Flame className="w-3.5 h-3.5" />
          {streak}d streak
        </motion.div>
      ) : (
        <span className="text-[11px] text-muted-foreground/40">
          {doneCount}/{elapsed} days
        </span>
      )}
    </div>
  );
}
