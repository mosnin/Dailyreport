"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  isFuture,
  getDay,
  isPast,
} from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp } from "@/lib/motion";

function ReportDetailPanel({
  userId,
  date,
  onClose,
}: {
  userId: Id<"users">;
  date: string;
  onClose: () => void;
}) {
  const report = useQuery(api.reports.getDailyReport, { userId, date });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="mt-4 rounded-xl border border-border bg-muted/50 p-4 relative"
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1 rounded-lg hover:bg-accent transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <p className="text-xs font-semibold text-muted-foreground mb-3">
        {format(new Date(date + "T12:00:00"), "EEEE, MMMM d, yyyy")}
      </p>
      {report === undefined ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : !report ? (
        <p className="text-sm text-muted-foreground italic">No report submitted for this day.</p>
      ) : (
        <ReportSummary responses={report.responses as Record<string, unknown>} />
      )}
    </motion.div>
  );
}

function ReportSummary({ responses }: { responses: Record<string, unknown> }) {
  const fields: { key: string; label: string }[] = [
    { key: "dayActivity", label: "Day activity" },
    { key: "emotionalDrain", label: "Emotional check-in" },
    { key: "tomorrowPlan", label: "Tomorrow plan" },
  ];

  return (
    <div className="space-y-3 text-sm">
      {fields.map(({ key, label }) => {
        const val = responses[key];
        if (!val || typeof val !== "string" || !val.trim()) return null;
        return (
          <div key={key}>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
            <p className="text-sm leading-relaxed">{val}</p>
          </div>
        );
      })}
      {Array.isArray(responses.problemsSolvedToday) &&
        (responses.problemsSolvedToday as string[]).length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Problems solved</p>
            <ul className="list-disc list-inside space-y-0.5 text-sm">
              {(responses.problemsSolvedToday as string[]).map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </div>
        )}
      {Array.isArray(responses.dailyGoals) &&
        (responses.dailyGoals as string[]).length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Goals for the day</p>
            <ul className="list-disc list-inside space-y-0.5 text-sm">
              {(responses.dailyGoals as string[]).map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </div>
        )}
    </div>
  );
}

export function CalendarGrid({
  userId,
  clickable = false,
}: {
  userId: Id<"users">;
  clickable?: boolean;
}) {
  const [current, setCurrent] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const data = useQuery(api.reports.getCalendarData, {
    userId,
    year: current.getFullYear(),
    month: current.getMonth(),
  });

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const dayStatus = (day: Date): "submitted" | "missed" | "future" | "today" | "outside" => {
    if (!isSameMonth(day, current)) return "outside";
    if (isFuture(day) && !isToday(day)) return "future";
    const key = format(day, "yyyy-MM-dd");
    if (data?.daily && (data.daily as Record<string, boolean>)[key]) return "submitted";
    if (isToday(day)) return "today";
    return "missed";
  };

  const isWeeklySubmitted = (day: Date): boolean => {
    if (getDay(day) !== 0) return false;
    const weekMonday = new Date(day);
    weekMonday.setDate(day.getDate() - 6);
    const key = format(weekMonday, "yyyy-MM-dd");
    return !!(data?.weekly && (data.weekly as Record<string, boolean>)[key]);
  };

  function handleDayClick(day: Date) {
    if (!clickable) return;
    if (!isSameMonth(day, current)) return;
    if (isFuture(day) && !isToday(day)) return;
    const key = format(day, "yyyy-MM-dd");
    setSelectedDate((prev) => (prev === key ? null : key));
  }

  const monthKey = format(current, "yyyy-MM");

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <motion.div {...fadeUp(0)} className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">{format(current, "MMMM yyyy")}</h3>
        <div className="flex gap-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setCurrent((d) => new Date(d.getFullYear(), d.getMonth() - 1)); setSelectedDate(null); }}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => { setCurrent((d) => new Date(d.getFullYear(), d.getMonth() + 1)); setSelectedDate(null); }}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={monthKey}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-7 gap-1"
        >
          {days.map((day) => {
            const status = dayStatus(day);
            const weeklyDone = isWeeklySubmitted(day);
            const key = format(day, "yyyy-MM-dd");
            const isSelected = selectedDate === key;
            const isClickable =
              clickable && isSameMonth(day, current) && (isPast(day) || isToday(day));
            return (
              <motion.button
                key={day.toISOString()}
                type="button"
                onClick={() => handleDayClick(day)}
                disabled={!isClickable}
                whileHover={isClickable ? { scale: 1.08 } : {}}
                whileTap={isClickable ? { scale: 0.95 } : {}}
                transition={{ duration: 0.15 }}
                className={cn(
                  "relative aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-colors",
                  status === "outside" && "opacity-20 text-muted-foreground",
                  status === "submitted" && "bg-green-500/20 text-green-600 dark:text-green-400",
                  status === "missed" && "bg-red-500/10 text-red-500 dark:text-red-400",
                  status === "today" && "bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-1 ring-amber-400",
                  status === "future" && "text-muted-foreground",
                  isSelected && "ring-2 ring-primary ring-offset-1",
                  isClickable && "cursor-pointer",
                  !isClickable && "cursor-default"
                )}
              >
                {format(day, "d")}
                {weeklyDone && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-400" />
                )}
              </motion.button>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-green-500" /> Submitted
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-red-500" /> Missed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded bg-amber-400" /> Today
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> Weekly done
        </span>
      </div>

      <AnimatePresence>
        {clickable && selectedDate && (
          <ReportDetailPanel
            userId={userId}
            date={selectedDate}
            onClose={() => setSelectedDate(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
