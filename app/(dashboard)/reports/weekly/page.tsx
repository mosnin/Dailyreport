"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { WeeklyReportForm } from "@/components/reports/WeeklyReportForm";
import { Skeleton } from "@/components/ui/skeleton";
import { currentWeekStartString, isSunday, nextSundayDate } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { CalendarClock, CheckCircle2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";

function WeekDraftCard({
  bullets,
  onUseBullet,
  usedIndexes,
}: {
  bullets: string[];
  onUseBullet: (bullet: string, index: number) => void;
  usedIndexes: Set<number>;
}) {
  const [open, setOpen] = useState(true);

  return (
    <motion.div {...fadeUp(0.04)} className="mb-7">
      <div className="bg-muted/40 rounded-xl border border-border/30 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 gap-2 hover:bg-muted/60 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/60">
              AI draft · tap a bullet to use
            </span>
          </span>
          {open ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/50" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" />
          )}
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="draft-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <ul className="px-4 pb-4 space-y-2">
                {bullets.map((bullet, i) => {
                  const used = usedIndexes.has(i);
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => !used && onUseBullet(bullet, i)}
                        disabled={used}
                        className={cn(
                          "w-full text-left text-sm px-3 py-2 rounded-lg border transition-all",
                          used
                            ? "border-emerald-500/30 bg-emerald-500/5 text-muted-foreground/50 cursor-default"
                            : "border-border/40 bg-background/60 hover:bg-background hover:border-indigo-400/40 hover:text-foreground text-muted-foreground cursor-pointer"
                        )}
                      >
                        <span className="flex items-start gap-2">
                          {used ? (
                            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-emerald-500 shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 mt-0.5 shrink-0 flex items-center justify-center text-[10px] text-muted-foreground/40">
                              {i + 1}
                            </span>
                          )}
                          {bullet}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default function WeeklyReportPage() {
  const { convexUserId, isLoading } = useConvexUser();
  const [usedBulletIndexes, setUsedBulletIndexes] = useState<Set<number>>(new Set());
  const [appendedBullets, setAppendedBullets] = useState<string[]>([]);

  const weekStart = currentWeekStartString();
  const existing = useQuery(
    api.reports.getWeeklyReport,
    convexUserId ? { userId: convexUserId, weekStartDate: weekStart } : "skip"
  );

  const weekDraft = useQuery(
    api.aiInternal.getWeekDraftPublic,
    convexUserId ? { userId: convexUserId, weekStartDate: weekStart } : "skip"
  );

  if (isLoading || !convexUserId) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!isSunday()) {
    const next = nextSundayDate();
    return (
      <div className="max-w-2xl">
        <motion.div {...fadeUp(0.08)} className="py-16 flex flex-col items-center text-center gap-5 max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
            <CalendarClock className="w-6 h-6 text-indigo-500" />
          </div>
          <div className="space-y-2">
            <p className="font-heading text-xl font-semibold">The week isn&apos;t over yet</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The weekly review opens on Sunday — a moment to close the week with intention.
              Your next window is{" "}
              <span className="font-medium text-foreground">{format(next, "EEEE, MMMM d")}</span>.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  function handleUseBullet(bullet: string, index: number) {
    setUsedBulletIndexes((prev) => new Set([...prev, index]));
    setAppendedBullets((prev) => [...prev, bullet]);
  }

  return (
    <div className="max-w-2xl">
      <motion.div {...fadeUp(0)} className="mb-10">
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/40 mb-1.5">
          Weekly Review
        </p>
        <h1 className="font-heading text-[2.2rem] font-semibold tracking-tight leading-[1.15]">
          {format(parseISO(weekStart + "T00:00:00"), "MMMM d")} — {format(new Date(), "MMMM d, yyyy")}
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-sm text-muted-foreground">Seven days to account for.</p>
          {existing && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
        </div>
      </motion.div>

      {weekDraft && weekDraft.bullets.length > 0 && (
        <WeekDraftCard
          bullets={weekDraft.bullets}
          onUseBullet={handleUseBullet}
          usedIndexes={usedBulletIndexes}
        />
      )}

      <WeeklyReportForm
        userId={convexUserId}
        initialResponses={existing?.responses as Record<string, unknown> | undefined}
        draftBullets={appendedBullets}
      />
    </div>
  );
}
