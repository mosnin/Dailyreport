import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, startOfWeek } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayString(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function currentWeekStartString(): string {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function formatDateLabel(dateStr: string): string {
  return format(new Date(dateStr + "T12:00:00"), "MMMM d, yyyy");
}
