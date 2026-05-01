"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { TimezoneModal } from "@/components/dashboard/TimezoneModal";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { YearRing } from "@/components/dashboard/YearRing";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { todayString } from "@/lib/utils";
import { Bell, ArrowRight, Check, BookOpen, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const ease = [0.16, 1, 0.3, 1] as const;

function fadeUp(delay = 0) {
  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, ease, delay },
  };
}

// ── Ritual step ───────────────────────────────────────────────────────────────

function RitualStep({
  done,
  label,
  sub,
  href,
  icon: Icon,
  index,
}: {
  done: boolean;
  label: string;
  sub?: string;
  href: string;
  icon: React.ElementType;
  index: number;
}) {
  return (
    <motion.div {...fadeUp(0.25 + index * 0.07)}>
      <Link
        href={href}
        className={cn(
          "flex items-center justify-between rounded-xl px-4 py-3 transition-colors",
          done
            ? "bg-muted/30 text-muted-foreground pointer-events-none"
            : "bg-muted/50 hover:bg-muted/70"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors",
              done ? "bg-emerald-500/15" : "bg-background/80 border border-border"
            )}
          >
            {done ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className={cn("text-sm font-medium", done && "line-through opacity-50")}>{label}</p>
            {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
          </div>
        </div>
        {!done && <ArrowRight className="w-4 h-4 text-muted-foreground/40" />}
      </Link>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { convexUserId, convexUser, isLoading } = useConvexUser();
  const { user } = useUser();
  const [showTzModal, setShowTzModal] = useState(false);

  const { pullDistance, refreshing } = usePullToRefresh(async () => {
    router.refresh();
    // Brief pause so the spinner is visible — feels intentional
    await new Promise((r) => setTimeout(r, 700));
  });
  const { subscribe, subscribed } = usePushSubscription(convexUserId);
  const { reportDone, affirmDone, vizDone, streak } = useTodayStatus(convexUserId);

  const brief = useQuery(
    api.aiInternal.getDailyBriefPublic,
    convexUserId ? { userId: convexUserId, date: todayString() } : "skip"
  );
  const allProblems = useQuery(
    api.problems.getAllProblems,
    convexUserId ? { userId: convexUserId } : "skip"
  ) as Array<{ solvedManually: boolean | null; aiResolved: boolean | null }> | undefined;
  const generateBrief = useAction(api.ai.generateMorningBrief);
  const briefTriggered = useRef(false);

  useEffect(() => {
    if (convexUser && !convexUser.timezone) setShowTzModal(true);
  }, [convexUser]);

  useEffect(() => {
    if (!convexUserId || brief === undefined || briefTriggered.current) return;
    if (brief !== null) return;
    briefTriggered.current = true;
    generateBrief({ userId: convexUserId }).catch(() => {});
  }, [brief, convexUserId, generateBrief]);

  if (isLoading || !convexUserId) return null;

  const firstName = user?.firstName ?? null;
  const allDone = reportDone && affirmDone && vizDone;
  const openProblems = (allProblems ?? []).filter(
    (p) => p.solvedManually !== true && !(p.solvedManually === null && p.aiResolved === true)
  ).length;

  return (
    <div
      className="max-w-5xl"
      style={{
        paddingTop: pullDistance > 0 ? `${pullDistance * 0.6}px` : undefined,
        transition: refreshing ? "none" : "padding-top 0.15s ease-out",
      }}
    >
      {/* Pull-to-refresh indicator — mobile only */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-end justify-center pointer-events-none"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          height: `calc(env(safe-area-inset-top) + ${Math.max(0, pullDistance)}px + 3.5rem)`,
          opacity: pullDistance > 10 ? Math.min(pullDistance / 72, 1) : 0,
          transition: refreshing ? "none" : "opacity 0.1s",
        }}
      >
        <div className="mb-3">
          <RefreshCw
            className={cn(
              "w-5 h-5 text-muted-foreground transition-transform",
              refreshing && "animate-spin"
            )}
            style={{
              transform: refreshing ? undefined : `rotate(${(pullDistance / 72) * 180}deg)`,
            }}
          />
        </div>
      </div>

      <div>

        {/* ── Main content ── */}
        <div className="max-w-xl space-y-8">

          {/* Date + greeting */}
          <motion.div {...fadeUp(0)}>
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/40 mb-1.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <h1 className="font-heading text-[2.1rem] font-semibold tracking-tight leading-[1.15]">
              {greeting()}{firstName ? `, ${firstName}` : ""}
            </h1>
          </motion.div>

          {/* Morning brief */}
          <AnimatePresence>
            {brief?.content && (
              <motion.p
                key="brief"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.2 }}
                className="font-heading italic text-[15px] leading-relaxed text-muted-foreground border-l-2 border-primary/30 pl-4"
              >
                {brief.content}
              </motion.p>
            )}
          </AnimatePresence>

          {/* ── Year ring + consistency panel ── */}
          <motion.div {...fadeUp(0.08)}>
            <div className="flex items-center gap-6 py-2">
              <YearRing userId={convexUserId} streak={streak} />
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground/40">
                  Daily consistency
                </p>
                <p className="text-sm text-muted-foreground/50 leading-snug">
                  {new Date().getFullYear()}
                </p>
                <p className="text-sm text-muted-foreground/60 leading-snug">
                  Keep going.
                </p>
                {streak > 0 && (
                  <p className="text-sm font-semibold text-orange-500 mt-1">
                    {streak} day{streak === 1 ? "" : "s"} in a row
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* ── BEFORE: entry not done ── */}
          <AnimatePresence mode="wait">
            {!reportDone ? (
              <motion.div key="before" className="space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>

                {/* Primary CTA */}
                <motion.div {...fadeUp(0.1)}>
                  <Link
                    href="/reports/daily"
                    className="group block rounded-2xl bg-foreground text-background px-8 py-7 hover:opacity-90 active:scale-[0.99] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-heading text-xl font-semibold">Begin today&apos;s entry</p>
                        <p className="text-sm opacity-55 mt-1">
                          {new Date().toLocaleDateString("en-US", { weekday: "long" })}&apos;s report is waiting.
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 opacity-50 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </motion.div>

                {/* Practice ritual */}
                <div className="space-y-2">
                  <motion.p {...fadeUp(0.22)} className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/40">
                    Your ritual
                  </motion.p>
                  <RitualStep done={affirmDone} label="Affirmations" sub="5 rounds" href="/affirmations" icon={Sparkles} index={0} />
                  <RitualStep done={vizDone} label="Visualizations" sub="60-second scenes" href="/dreams" icon={BookOpen} index={1} />
                </div>
              </motion.div>

            ) : (
              /* ── AFTER: entry done ── */
              <motion.div key="after" className="space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>

                {/* Compact stats */}
                <motion.div {...fadeUp(0.22)}>
                  <StatsBar userId={convexUserId} compact />
                </motion.div>

                {/* Ritual completion */}
                <div className="space-y-2">
                  <motion.p {...fadeUp(0.15)} className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/40">
                    Your ritual
                  </motion.p>
                  <RitualStep done={true}       label="Today's entry"  href="/reports/daily"  icon={BookOpen}  index={0} />
                  <RitualStep done={affirmDone} label="Affirmations"   sub="5 rounds" href="/affirmations" icon={Sparkles} index={1} />
                  <RitualStep done={vizDone}    label="Visualizations"  sub="60-second scenes" href="/dreams" icon={BookOpen} index={2} />
                </div>

                {/* Open problems nudge */}
                {openProblems > 0 && (
                  <motion.div {...fadeUp(0.28)}>
                    <Link
                      href="/problems"
                      className="flex items-center justify-between rounded-xl px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-sm text-muted-foreground">
                          {openProblems} open problem{openProblems === 1 ? "" : "s"}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
                    </Link>
                  </motion.div>
                )}

                {/* Push prompt */}
                {!subscribed &&
                  typeof window !== "undefined" &&
                  "Notification" in window &&
                  Notification.permission !== "granted" && (
                    <motion.div {...fadeUp(0.35)} className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Bell className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                        <span className="text-muted-foreground/60 text-sm">Get reminded at 8pm every day.</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={subscribe} className="text-xs">Enable</Button>
                    </motion.div>
                  )}


              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {convexUserId && (
        <TimezoneModal
          userId={convexUserId}
          open={showTzModal}
          onClose={() => setShowTzModal(false)}
        />
      )}
    </div>
  );
}
