"use client";

import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, todayString } from "@/lib/utils";
import { Lightbulb, RefreshCw, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp, listVariants, itemVariants } from "@/lib/motion";

// ── Principle badge colors ────────────────────────────────────────────────

const PRINCIPLE_COLORS: Record<string, string> = {
  "Focus":       "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "Momentum":    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Resilience":  "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  "Perspective": "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "Discipline":  "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "Relationships": "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  "Energy":      "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "Clarity":     "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  "Courage":     "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  "Growth":      "bg-lime-500/10 text-lime-600 dark:text-lime-400",
};

function PrincipleBadge({ principle, inverted }: { principle: string; inverted?: boolean }) {
  const cls = inverted
    ? "bg-background/15 text-background"
    : (PRINCIPLE_COLORS[principle] ?? "bg-muted text-muted-foreground");
  return (
    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", cls)}>
      {principle}
    </span>
  );
}

// ── Featured card (index === 0) ───────────────────────────────────────────

function FeaturedCard({ story }: { story: { title: string; principle: string; story: string } }) {
  return (
    <motion.div
      variants={itemVariants}
      className="rounded-2xl bg-foreground text-background p-7 space-y-4"
    >
      <PrincipleBadge principle={story.principle} inverted />
      <p className="font-heading text-[1.35rem] font-semibold leading-snug">{story.title}</p>
      <p className="text-sm leading-[1.9] text-background/75 whitespace-pre-line">{story.story}</p>
    </motion.div>
  );
}

// ── Compact story card (index >= 1) ──────────────────────────────────────

function StoryCard({
  story,
  index,
}: {
  story: { title: string; principle: string; story: string };
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div variants={itemVariants} className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3.5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <PrincipleBadge principle={story.principle} />
            </div>
            <p className="font-medium text-sm leading-snug">{story.title}</p>
          </div>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-4 h-4 text-muted-foreground/50 shrink-0" />
          </motion.div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border/50">
              <p className="text-sm leading-[1.8] text-foreground/85 whitespace-pre-line">
                {story.story}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Skeleton cards ────────────────────────────────────────────────────────

function StorySkeleton({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="rounded-2xl bg-muted/60 min-h-[180px] p-7 space-y-4">
        <Skeleton className="h-5 w-1/4 rounded-full" />
        <Skeleton className="h-6 w-3/4" />
        <div className="space-y-2 pt-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3.5 space-y-2">
      <Skeleton className="h-4 w-1/4 rounded-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function InspirationPage() {
  const { convexUserId, isLoading } = useConvexUser();
  const today = todayString();

  const existing = useQuery(
    api.aiInternal.getInspirationForDatePublic,
    convexUserId ? { userId: convexUserId, date: today } : "skip"
  );

  const generateInspirations = useAction(api.ai.generateInspirations);

  const [generating, setGenerating] = useState(false);
  const [stories, setStories] = useState<{ title: string; principle: string; story: string }[] | null>(null);

  // Auto-generate on first load if not yet generated today
  useEffect(() => {
    if (existing === undefined || generating) return;
    if (existing !== null) {
      setStories(existing.stories);
      return;
    }
    if (!convexUserId) return;

    let cancelled = false;
    setGenerating(true);
    generateInspirations({ userId: convexUserId, force: false })
      .then((result) => {
        if (!cancelled && Array.isArray(result)) setStories(result);
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't generate stories. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setGenerating(false);
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing === undefined, convexUserId]);

  async function handleRegenerate() {
    if (!convexUserId || generating) return;
    setGenerating(true);
    try {
      const result = await generateInspirations({ userId: convexUserId, force: true });
      if (Array.isArray(result) && result.length > 0) {
        setStories(result);
        toast.success("New stories generated.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed.";
      toast.error(msg.includes("Daily limit") ? msg : "Generation failed. Try again later.");
    } finally {
      setGenerating(false);
    }
  }

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-xl space-y-4">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-64" />
        {[0, 1, 2, 3, 4].map((i) => <StorySkeleton key={i} index={i} />)}
      </div>
    );
  }

  const displayStories = stories ?? (existing?.stories ?? null);
  const showSkeletons = generating && !displayStories;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <motion.div {...fadeUp(0)} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">Today's Coaching</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Drawn from your reports, written for where you are right now.
          </p>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={generating}
          className={cn(
            "shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
            generating && "opacity-50 cursor-not-allowed"
          )}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", generating && "animate-spin")} />
          {generating ? "Generating…" : "Regenerate"}
        </button>
      </motion.div>

      {/* Content */}
      {showSkeletons ? (
        <>
          <div className="text-sm text-muted-foreground animate-pulse text-center py-2">
            Crafting your wisdom stories…
          </div>
          {[0, 1, 2, 3, 4].map((i) => <StorySkeleton key={i} index={i} />)}
        </>
      ) : displayStories && displayStories.length > 0 ? (
        <motion.div
          className="space-y-3"
          variants={listVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Featured first card */}
          {displayStories.length > 0 && (
            <FeaturedCard story={displayStories[0]} />
          )}

          {/* Rest as compact list */}
          {displayStories.length > 1 && (
            <div className="space-y-2">
              {displayStories.slice(1).map((story, i) => (
                <StoryCard key={i} story={story} index={i + 1} />
              ))}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground/50 text-center pt-2">
            Refreshes daily based on your reports, goals, and recent patterns.
          </p>
        </motion.div>
      ) : !generating ? (
        <motion.div {...fadeUp(0.1)} className="text-center py-16 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/10 flex items-center justify-center mx-auto">
            <Lightbulb className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <p className="font-semibold">No stories yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              Add some goals or daily reports and come back for your first coaching reflections.
            </p>
          </div>
          <button
            onClick={handleRegenerate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Lightbulb className="w-4 h-4" />
            Generate stories
          </button>
        </motion.div>
      ) : null}
    </div>
  );
}
