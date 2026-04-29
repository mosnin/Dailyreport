"use client";

import { useEffect, useState, useRef } from "react";
import { useQuery, useAction } from "convex/react";
// useAction is used for generateMorningBrief
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { CalendarGrid } from "@/components/dashboard/CalendarGrid";
import { TimezoneModal } from "@/components/dashboard/TimezoneModal";
import { ScoreChart } from "@/components/dashboard/ScoreChart";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { todayString } from "@/lib/utils";
import { Bell, ArrowRight, Flame, Check, BookOpen, Sparkles } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Ritual step row ───────────────────────────────────────────────────────────

function RitualStep({
  done,
  label,
  sub,
  href,
  icon: Icon,
}: {
  done: boolean;
  label: string;
  sub?: string;
  href: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between rounded-xl px-4 py-3 transition-colors",
        done
          ? "bg-muted/30 text-muted-foreground pointer-events-none"
          : "bg-muted/40 hover:bg-muted/60"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
            done ? "bg-emerald-500/15" : "bg-muted"
          )}
        >
          {done ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className={cn("text-sm font-medium", done && "line-through")}>{label}</p>
          {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
        </div>
      </div>
      {!done && <ArrowRight className="w-4 h-4 text-muted-foreground/50" />}
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { convexUserId, convexUser, isLoading } = useConvexUser();
  const { user } = useUser();
  const [showTzModal, setShowTzModal] = useState(false);
  const { subscribe, subscribed } = usePushSubscription(convexUserId);
  const { reportDone, affirmDone, vizDone, streak } = useTodayStatus(convexUserId);

  const brief = useQuery(
    api.aiInternal.getDailyBriefPublic,
    convexUserId ? { userId: convexUserId, date: todayString() } : "skip"
  );
  const generateBrief = useAction(api.ai.generateMorningBrief);
  const briefTriggered = useRef(false);

  useEffect(() => {
    if (convexUser && !convexUser.timezone) setShowTzModal(true);
  }, [convexUser]);

  useEffect(() => {
    if (!convexUserId || brief === undefined || briefTriggered.current) return;
    if (brief !== null) return; // already exists
    briefTriggered.current = true;
    generateBrief({ userId: convexUserId }).catch(() => {});
  }, [brief, convexUserId, generateBrief]);

  if (isLoading || !convexUserId) return null;

  const firstName = user?.firstName ?? null;
  const allDone = reportDone && affirmDone && vizDone;

  return (
    <div className="max-w-lg space-y-8">

      {/* Date + greeting */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/50 mb-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting()}{firstName ? `, ${firstName}` : ""}
        </h1>
      </div>

      {/* Morning brief — mentor sentence */}
      {brief?.content && (
        <p className="text-[15px] leading-relaxed text-muted-foreground italic border-l-2 border-border/50 pl-4">
          {brief.content}
        </p>
      )}

      {/* ── BEFORE state: entry not done ── */}
      {!reportDone && (
        <>
          {/* Primary CTA */}
          <Link
            href="/reports/daily"
            className="group block rounded-2xl bg-foreground text-background px-8 py-7 hover:opacity-90 transition-opacity"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">Begin today&apos;s entry</p>
                <p className="text-sm opacity-60 mt-0.5">
                  {new Date().toLocaleDateString("en-US", { weekday: "long" })}&apos;s report is waiting.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 opacity-60 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Streak (small, encouraging) */}
          {streak > 0 && (
            <div className="flex items-center gap-2 text-sm text-orange-500 font-medium">
              <Flame className="w-4 h-4" />
              <span>{streak} day streak — keep it going.</span>
            </div>
          )}

          {/* Practice ritual steps */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/50 mb-3">
              Your ritual
            </p>
            <RitualStep
              done={affirmDone}
              label="Affirmations"
              sub="5 rounds"
              href="/affirmations"
              icon={Sparkles}
            />
            <RitualStep
              done={vizDone}
              label="Visualization"
              sub="60-second scenes"
              href="/dreams"
              icon={BookOpen}
            />
          </div>
        </>
      )}

      {/* ── AFTER state: entry done ── */}
      {reportDone && (
        <>
          {/* Streak hero */}
          {streak > 0 && (
            <div className="text-center py-6">
              <Flame className="w-8 h-8 text-orange-500 mx-auto mb-3" />
              <p className="text-[72px] font-bold tabular-nums leading-none tracking-tight text-orange-500">
                {streak}
              </p>
              <p className="text-base text-muted-foreground mt-2">
                day{streak === 1 ? "" : "s"} in a row
              </p>
              {allDone && (
                <p className="text-sm text-muted-foreground/60 mt-3 italic">
                  The work is done. Rest well.
                </p>
              )}
            </div>
          )}

          {/* Ritual completion state */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground/50 mb-3">
              Your ritual
            </p>
            <RitualStep
              done={true}
              label="Today's entry"
              href="/reports/daily"
              icon={BookOpen}
            />
            <RitualStep
              done={affirmDone}
              label="Affirmations"
              sub="5 rounds"
              href="/affirmations"
              icon={Sparkles}
            />
            <RitualStep
              done={vizDone}
              label="Visualization"
              sub="60-second scenes"
              href="/dreams"
              icon={BookOpen}
            />
          </div>

          {/* Stats + history — only visible after report is done */}
          <StatsBar userId={convexUserId} />

          {/* Push prompt */}
          {!subscribed &&
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission !== "granted" && (
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4 text-muted-foreground/60 shrink-0" />
                  <span className="text-muted-foreground/70 text-sm">
                    Get reminded at 8pm every day.
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={subscribe} className="text-xs">
                  Enable
                </Button>
              </div>
            )}

          <ScoreChart userId={convexUserId} />
          <CalendarGrid userId={convexUserId} />
        </>
      )}

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
