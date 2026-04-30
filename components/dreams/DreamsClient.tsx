"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle2, Eye, RefreshCw, Play, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { todayString } from "@/lib/utils";
import { DreamsManagement } from "./DreamsManagement";

// ── Countdown ring ─────────────────────────────────────────────────────────

const RADIUS = 44;
const CIRC = 2 * Math.PI * RADIUS;

function CountdownRing({ seconds, total = 60 }: { seconds: number; total?: number }) {
  const offset = CIRC * (1 - seconds / total);
  return (
    <div className="relative flex items-center justify-center">
      <svg width="108" height="108" className="-rotate-90">
        <circle
          cx="54" cy="54" r={RADIUS}
          strokeWidth="3" fill="none"
          className="stroke-neutral-200 dark:stroke-neutral-800"
        />
        <circle
          cx="54" cy="54" r={RADIUS}
          strokeWidth="3" fill="none"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="stroke-sky-500 transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span className="absolute text-2xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
        {seconds}
      </span>
    </div>
  );
}

// ── Scenario card ──────────────────────────────────────────────────────────

function ScenarioCard({
  index,
  title,
  description,
  completed,
  onStart,
}: {
  index: number;
  title: string;
  description: string;
  completed: boolean;
  onStart: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 flex flex-col gap-3 transition-colors",
        completed
          ? "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20"
          : "border-neutral-200 dark:border-white/8 bg-white dark:bg-neutral-900"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-mono font-semibold text-sky-500 dark:text-sky-400">
          {String(index + 1).padStart(2, "0")}
        </span>
        {completed && (
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1.5 leading-snug">
          {title}
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
          {description}
        </p>
      </div>

      <div className="mt-auto pt-1">
        {completed ? (
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Visualized
          </span>
        ) : (
          <button
            onClick={onStart}
            className="flex items-center gap-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
          >
            <Play className="w-3 h-3" />
            Start 60s
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function DreamsClient({ userId }: { userId: Id<"users"> }) {
  const todayStr = todayString();

  const viz = useQuery(api.visualizations.getForDate, { userId, date: todayStr });
  const generateVisualizations = useAction(api.ai.generateVisualizations);
  const markCompleted = useMutation(api.visualizations.markCompleted);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [phase, setPhase] = useState<"ready" | "timing" | "done">("ready");
  const [seconds, setSeconds] = useState(60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-generate on first load if no record exists
  useEffect(() => {
    if (viz === null && !generating) {
      setGenerating(true);
      generateVisualizations({ userId, force: false })
        .catch((err) => setGenError(err instanceof Error ? err.message : "Generation failed"))
        .finally(() => setGenerating(false));
    }
  }, [viz]); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark complete when phase reaches "done"
  useEffect(() => {
    if (phase === "done" && viz && activeIdx !== null) {
      markCompleted({ vizId: viz._id, index: activeIdx }).catch(console.error);
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  function openVisualization(idx: number) {
    setActiveIdx(idx);
    setPhase("ready");
    setSeconds(60);
  }

  function startTimer() {
    setPhase("timing");
    setSeconds(60);
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setPhase("done");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function skipTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPhase("done");
  }

  function closeDialog() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setPhase("ready");
    setSeconds(60);
    setActiveIdx(null);
  }

  async function handleRegenerate() {
    setGenerating(true);
    setGenError(null);
    try {
      await generateVisualizations({ userId, force: true });
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Regeneration failed");
    } finally {
      setGenerating(false);
    }
  }

  const scenarios = viz?.scenarios ?? [];
  const completedSet = new Set(viz?.completedIndexes ?? []);
  const completedCount = completedSet.size;
  const totalCount = scenarios.length || 10;
  const allDone = scenarios.length > 0 && completedCount >= scenarios.length;

  const activeScenario = activeIdx !== null ? scenarios[activeIdx] : null;

  // ── Loading / generating state ─────────────────────────────────────────

  if (viz === undefined || (viz === null && generating)) {
    return (
      <div className="max-w-3xl mx-auto space-y-10">
        <DreamsManagement userId={userId} />
        <div className="border-t border-border" />
        <div>
          <div className="flex items-center gap-3 mb-8">
            <Eye className="w-5 h-5 text-sky-500" />
            <h2 className="text-xl font-semibold">Today&apos;s Visualizations</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Generating your visualizations&hellip;
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* ── Dream management ── */}
      <DreamsManagement userId={userId} />

      {/* ── Divider ── */}
      <div className="border-t border-border" />

      {/* ── Visualizations ── */}
      <section className="space-y-0">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Eye className="w-5 h-5 text-sky-500" />
            <h2 className="text-xl font-semibold">Today&apos;s Visualizations</h2>
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/customize"
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors"
          >
            Style →
          </Link>
          <button
            onClick={handleRegenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3 h-3", generating && "animate-spin")} />
            Regenerate
          </button>
        </div>
      </div>

      {/* ── Progress ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
            {completedCount} of {totalCount} visualized
          </span>
          {allDone && (
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Complete for today
            </span>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-sky-500 transition-all duration-500"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {genError && (
        <p className="text-sm text-destructive mb-6">{genError}</p>
      )}

      {/* ── All done state ── */}
      {allDone && (
        <div className="mb-8 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/20 p-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
          <p className="font-semibold text-emerald-800 dark:text-emerald-300">
            All 10 visualizations complete.
          </p>
          <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">
            Come back tomorrow for a fresh set.
          </p>
        </div>
      )}

      {/* ── Cards grid ── */}
      {scenarios.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {scenarios.map((s, i) => (
            <ScenarioCard
              key={i}
              index={i}
              title={s.title}
              description={s.description}
              completed={completedSet.has(i)}
              onStart={() => openVisualization(i)}
            />
          ))}
        </div>
      ) : (
        !generating && (
          <div className="text-center py-16 text-neutral-400 dark:text-neutral-600">
            <p className="text-sm">No visualizations generated yet.</p>
          </div>
        )
      )}

      {/* ── Visualization dialog ── */}
      <Dialog open={activeIdx !== null} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-md gap-0 p-0 overflow-hidden">
          <DialogTitle className="sr-only">
            {activeScenario?.title ?? "Visualization"}
          </DialogTitle>

          {/* Header bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-sky-500" />
              <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                Visualization {activeIdx !== null ? activeIdx + 1 : ""} of {totalCount}
              </span>
            </div>
          </div>

          <div className="px-6 py-6 space-y-6">
            {activeScenario && (
              <>
                <div>
                  <h2 className="text-base font-semibold mb-3 leading-snug">
                    {activeScenario.title}
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {activeScenario.description}
                  </p>
                </div>

                {/* Phase: ready */}
                {phase === "ready" && (
                  <div className="flex flex-col items-center gap-4 pt-2">
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center">
                      Read the scene above. When you&rsquo;re ready, close your eyes and begin.
                    </p>
                    <button
                      onClick={startTimer}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Begin 60 seconds
                    </button>
                  </div>
                )}

                {/* Phase: timing */}
                {phase === "timing" && (
                  <div className="flex flex-col items-center gap-4">
                    <CountdownRing seconds={seconds} />
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center">
                      Close your eyes. Breathe slowly. See it clearly.
                    </p>
                    <button
                      onClick={skipTimer}
                      className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
                    >
                      Skip timer
                    </button>
                  </div>
                )}

                {/* Phase: done */}
                {phase === "done" && (
                  <div className="flex flex-col items-center gap-4 pt-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      Visualization complete.
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={closeDialog}
                        className="px-4 py-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                      >
                        Close
                      </button>
                      {activeIdx !== null && activeIdx < scenarios.length - 1 && !completedSet.has(activeIdx + 1) && (
                        <button
                          onClick={() => {
                            const nextIdx = activeIdx + 1;
                            closeDialog();
                            setTimeout(() => openVisualization(nextIdx), 50);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors"
                        >
                          Next
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
      </section>
    </div>
  );
}
