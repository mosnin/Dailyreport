"use client";

import { useState, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { GoalSection } from "@/components/goals/GoalSection";
import { Skeleton } from "@/components/ui/skeleton";
import { type GoalCategory, periodLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp } from "@/lib/motion";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";

const TABS: { key: GoalCategory; label: string }[] = [
  { key: "weekly",    label: "Week" },
  { key: "monthly",   label: "Month" },
  { key: "quarterly", label: "Quarter" },
  { key: "yearly",    label: "Year" },
];

const CATEGORIES: GoalCategory[] = ["yearly", "quarterly", "monthly", "weekly"];

const CATEGORY_META: Record<GoalCategory, { label: string; color: string; dot: string }> = {
  yearly:    { label: "Year",    color: "text-chart-1", dot: "bg-chart-1" },
  quarterly: { label: "Quarter", color: "text-chart-2", dot: "bg-chart-2" },
  monthly:   { label: "Month",   color: "text-chart-3", dot: "bg-chart-3" },
  weekly:    { label: "Week",    color: "text-chart-4", dot: "bg-chart-4" },
};

export default function GoalsPage() {
  const { convexUserId, isLoading } = useConvexUser();
  const [activeTab, setActiveTab] = useState<GoalCategory>("weekly");

  const summary = useQuery(
    api.goals.getCurrentSummary,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  const parseGoals = useAction(api.ai.parseGoalsFromText);
  const [aiInput, setAiInput] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const [aiResult, setAiResult] = useState<{ title: string; category: string }[] | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleParseGoals(e: React.FormEvent) {
    e.preventDefault();
    const text = aiInput.trim();
    if (!text || !convexUserId) return;
    setAiParsing(true);
    setAiResult(null);
    try {
      const parsed = await parseGoals({ userId: convexUserId, text });
      setAiResult(parsed);
      setAiInput("");
    } finally {
      setAiParsing(false);
    }
  }

  if (isLoading || !convexUserId) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <motion.div {...fadeUp(0)}>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">Goals</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track what you&apos;re working toward across every time horizon.
        </p>
      </motion.div>

      {/* Overview strip — compact scoreboard */}
      <motion.div {...fadeUp(1)} className="grid grid-cols-4 gap-2">
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          const data = summary?.[cat];
          const total = data?.total ?? 0;
          const completed = data?.completed ?? 0;
          const pct = total > 0 ? Math.round((completed / total) * 100) : null;
          const pk = data?.periodKey ?? "";
          const isActive = activeTab === cat;

          return (
            <div
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={cn(
                "rounded-xl border border-border bg-card p-2 flex flex-col gap-1.5 cursor-pointer transition-all",
                isActive
                  ? "ring-1 ring-border shadow-sm"
                  : "opacity-70 hover:opacity-90"
              )}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0 transition-opacity",
                    meta.dot,
                    isActive ? "opacity-100" : "opacity-60"
                  )}
                />
                <span className="text-xs font-medium truncate">{meta.label}</span>
              </div>
              <div className="text-lg font-bold leading-none">
                {summary === undefined ? (
                  <span className="text-muted-foreground text-sm">…</span>
                ) : total === 0 ? (
                  <span className="text-muted-foreground text-sm">—</span>
                ) : (
                  <span className={pct === 100 ? "text-green-500" : undefined}>
                    {pct}%
                  </span>
                )}
              </div>
              {total > 0 && (
                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      meta.dot,
                      isActive ? "opacity-100" : "opacity-60"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
              {pk && (
                <p className="text-[10px] text-muted-foreground/70 truncate leading-tight">
                  {periodLabel(cat, pk)}
                </p>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* AI goal parser */}
      <motion.div {...fadeUp(2)}>
        <form onSubmit={handleParseGoals} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-start gap-3 px-4 pt-4 pb-3">
            <Sparkles className="w-4 h-4 text-muted-foreground/50 mt-0.5 shrink-0" />
            <textarea
              ref={textareaRef}
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleParseGoals(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Describe your goals in plain English — I'll sort them into the right buckets."
              rows={2}
              className="flex-1 text-sm bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/40 leading-relaxed"
            />
          </div>
          <div className="flex items-center justify-between px-4 pb-3">
            <span className="text-[11px] text-muted-foreground/40">
              e.g. &ldquo;Lose 10 lbs this year, launch the landing page this week, read a book this month&rdquo;
            </span>
            <button
              type="submit"
              disabled={!aiInput.trim() || aiParsing}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary disabled:opacity-30 hover:opacity-80 transition-opacity"
            >
              {aiParsing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              {aiParsing ? "Parsing…" : "Add goals"}
            </button>
          </div>
        </form>

        <AnimatePresence>
          {aiResult && aiResult.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-2 flex flex-wrap gap-1.5"
            >
              {aiResult.map((g, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium px-2.5 py-1"
                >
                  <span className="opacity-60 capitalize">{g.category}</span>
                  <span>·</span>
                  {g.title}
                </span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Tab bar */}
      <motion.div {...fadeUp(3)} className="flex gap-1 p-1 rounded-xl bg-muted/60">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Active GoalSection */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <GoalSection userId={convexUserId} category={activeTab} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
