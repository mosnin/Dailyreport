"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import { DailyReportForm } from "@/components/reports/DailyReportForm";
import { Skeleton } from "@/components/ui/skeleton";
import { todayString } from "@/lib/utils";
import { CheckCircle2, Flame, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { motion } from "motion/react";
import { fadeUp } from "@/lib/motion";
import { format } from "date-fns";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Completion ceremony ───────────────────────────────────────────────────

function CompletionOverlay({
  streak,
  onDismiss,
  isPastDate,
  callback,
}: {
  streak: number;
  onDismiss: () => void;
  isPastDate: boolean;
  callback?: string;
}) {
  const today = new Date();
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/96 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div className="text-center space-y-8 max-w-sm px-6 pointer-events-none select-none">
        <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-muted-foreground/50">
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>

        {!isPastDate && streak > 0 ? (
          <div className="space-y-2">
            <p className="text-[80px] font-bold tabular-nums leading-none tracking-tight text-foreground">
              {streak}
            </p>
            <div className="flex items-center justify-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              <p className="text-base text-muted-foreground">
                day{streak === 1 ? "" : "s"} in a row
              </p>
            </div>
          </div>
        ) : (
          <div>
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
          </div>
        )}

        <p className="text-sm text-muted-foreground/60 tracking-wide">
          {isPastDate ? "Caught up. Well done." : "The work is done. Rest well."}
        </p>

        {callback && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-heading italic text-sm text-foreground/70 max-w-[260px] mx-auto leading-relaxed"
          >
            &ldquo;{callback}&rdquo;
          </motion.p>
        )}

        <button
          onClick={onDismiss}
          className="pointer-events-auto text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="max-w-2xl space-y-8 py-4">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-40" />
      </div>
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

// ── Inner component (needs useSearchParams → must be inside Suspense) ─────

function DailyReportContent() {
  const searchParams = useSearchParams();
  const { convexUserId, isLoading } = useConvexUser();
  const { streak } = useTodayStatus(convexUserId);
  const [completed, setCompleted] = useState(false);
  const [callback, setCallback] = useState<string>("");
  const generateCallback = useAction(api.ai.generateSubmitCallback);

  const today = todayString();
  const dateParam = searchParams.get("date");
  const isPastDate =
    !!dateParam &&
    dateParam < today &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateParam);
  const targetDate = isPastDate ? dateParam! : today;

  const existing = useQuery(
    api.reports.getDailyReport,
    convexUserId ? { userId: convexUserId, date: targetDate } : "skip"
  );

  if (isLoading || !convexUserId) {
    return <LoadingSkeleton />;
  }

  async function handleSuccess() {
    setCompleted(true);
    // Fire-and-forget: generate the personalized callback without blocking the overlay
    try {
      const text = existing
        ? [
            (existing.responses as any)?.dayActivity,
            (existing.responses as any)?.emotionalDrain,
            (existing.responses as any)?.tomorrowPlan,
            ...((existing.responses as any)?.problemsToSolve ?? []).map((p: any) => p.title),
          ].filter(Boolean).join(" ")
        : "";
      if (text.trim() && convexUserId) {
        const result = await generateCallback({
          userId: convexUserId,
          reportText: text,
          date: targetDate,
        });
        setCallback(result);
      }
    } catch {
      // non-critical, ignore
    }
  }

  const dateObj = new Date(targetDate + "T12:00:00");

  return (
    <>
      {completed && (
        <CompletionOverlay
          streak={streak}
          onDismiss={() => setCompleted(false)}
          isPastDate={isPastDate}
          callback={callback}
        />
      )}

      <div className="max-w-2xl py-4">
        {/* Notebook header */}
        <motion.div {...fadeUp(0)} className="mb-10">
          {isPastDate ? (
            <>
              <Link
                href="/calendar"
                className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors mb-1.5"
              >
                <ArrowLeft className="w-3 h-3" />
                Catching up
              </Link>
              <h1 className="font-heading text-[2.2rem] font-semibold tracking-tight leading-[1.15]">
                {format(dateObj, "MMMM d")}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-sm text-muted-foreground">
                  {format(dateObj, "EEEE, yyyy")}
                </p>
                {existing && (
                  <span className={cn("flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400")}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Saved
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/40 mb-1.5">
                {greeting()}
              </p>
              <h1 className="font-heading text-[2.2rem] font-semibold tracking-tight leading-[1.15]">
                {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric" })}
                </p>
                {existing && (
                  <span className={cn("flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400")}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Saved
                  </span>
                )}
                {streak > 0 && (
                  <span className="flex items-center gap-1 text-xs font-medium text-orange-500">
                    <Flame className="w-3.5 h-3.5" />
                    {streak}d streak
                  </span>
                )}
              </div>
            </>
          )}
        </motion.div>

        {/* The form */}
        <motion.div {...fadeUp(0.08)}>
          <DailyReportForm
            userId={convexUserId}
            date={targetDate}
            initialResponses={existing?.responses as Record<string, unknown> | undefined}
            onSuccess={handleSuccess}
          />
        </motion.div>

        <div className="mt-6 pt-6 border-t border-border/40 flex items-center justify-center gap-6 text-xs text-muted-foreground/40">
          <Link href="/affirmations" className="hover:text-muted-foreground transition-colors">Affirmations</Link>
          <Link href="/dreams" className="hover:text-muted-foreground transition-colors">Visualizations</Link>
          <Link href="/goals" className="hover:text-muted-foreground transition-colors">Goals</Link>
        </div>
      </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function DailyReportPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <DailyReportContent />
    </Suspense>
  );
}
