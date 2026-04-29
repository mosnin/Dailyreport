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
} from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function CalendarGrid({ userId }: { userId: Id<"users"> }) {
  const [current, setCurrent] = useState(new Date());

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

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">{format(current, "MMMM yyyy")}</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() - 1))}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrent((d) => new Date(d.getFullYear(), d.getMonth() + 1))}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const status = dayStatus(day);
          const weeklyDone = isWeeklySubmitted(day);
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "relative aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-colors",
                status === "outside" && "opacity-20 text-muted-foreground",
                status === "submitted" && "bg-green-500/20 text-green-600 dark:text-green-400",
                status === "missed" && "bg-red-500/10 text-red-500 dark:text-red-400",
                status === "today" && "bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-1 ring-amber-400",
                status === "future" && "text-muted-foreground"
              )}
            >
              {format(day, "d")}
              {weeklyDone && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
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
    </div>
  );
}
