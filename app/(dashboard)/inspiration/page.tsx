"use client";

import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, todayString } from "@/lib/utils";
import { Lightbulb, RefreshCw, BookOpen } from "lucide-react";
import { toast } from "sonner";

// ── Principle badge colors ────────────────────────────────────────────────

const PRINCIPLE_COLORS: Record<string, string> = {
  "Definiteness of Purpose": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "The Master Mind": "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  "Applied Faith": "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "Going the Extra Mile": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "Personal Initiative": "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  "Positive Mental Attitude": "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "Self-Discipline": "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  "Accurate Thinking": "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  "Creative Vision": "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  "Learning from Adversity and Defeat": "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  "Enthusiasm": "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  "Controlled Attention": "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  "Organized Planning": "bg-lime-500/10 text-lime-600 dark:text-lime-400",
  "Decision": "bg-red-500/10 text-red-600 dark:text-red-400",
  "Teamwork": "bg-green-500/10 text-green-600 dark:text-green-400",
};

function PrincipleBadge({ principle }: { principle: string }) {
  const cls = PRINCIPLE_COLORS[principle] ?? "bg-muted text-muted-foreground";
  return (
    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", cls)}>
      {principle}
    </span>
  );
}

// ── Story card ────────────────────────────────────────────────────────────

function StoryCard({
  story,
  index,
}: {
  story: { title: string; principle: string; story: string };
  index: number;
}) {
  const [expanded, setExpanded] = useState(index === 0);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-5 py-4 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl font-bold text-muted-foreground/20 leading-none tabular-nums mt-0.5 select-none">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base leading-snug mb-1.5">{story.title}</p>
            <PrincipleBadge principle={story.principle} />
          </div>
          <BookOpen className={cn("w-4 h-4 shrink-0 text-muted-foreground mt-0.5 transition-opacity", expanded ? "opacity-100" : "opacity-40")} />
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-6 pt-1 border-t border-border/50">
          <p className="text-sm leading-[1.8] text-foreground/85 whitespace-pre-line">
            {story.story}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Skeleton cards ────────────────────────────────────────────────────────

function StorySkeleton({ index }: { index: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-start gap-3">
        <Skeleton className="w-8 h-7 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/3 rounded-full" />
        </div>
      </div>
      {index === 0 && (
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      )}
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
    <div className="max-w-xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <Lightbulb className="w-6 h-6 text-amber-400 fill-amber-400/20" />
            Daily Inspiration
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Wisdom from Napoleon Hill, told through your story.
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
      </div>

      {/* Content */}
      {showSkeletons ? (
        <>
          <div className="text-sm text-muted-foreground animate-pulse text-center py-2">
            Crafting your wisdom stories…
          </div>
          {[0, 1, 2, 3, 4].map((i) => <StorySkeleton key={i} index={i} />)}
        </>
      ) : displayStories && displayStories.length > 0 ? (
        <div className="space-y-3">
          {displayStories.map((s, i) => (
            <StoryCard key={i} story={s} index={i} />
          ))}
          <p className="text-[11px] text-muted-foreground/50 text-center pt-2">
            Stories regenerate daily based on your reports, goals, and patterns.
          </p>
        </div>
      ) : !generating ? (
        <div className="text-center py-16 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-400/10 flex items-center justify-center mx-auto">
            <Lightbulb className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <p className="font-semibold">No stories yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              Add some goals, dreams, or daily reports and come back to generate your first wisdom stories.
            </p>
          </div>
          <button
            onClick={handleRegenerate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Lightbulb className="w-4 h-4" />
            Generate stories
          </button>
        </div>
      ) : null}
    </div>
  );
}
