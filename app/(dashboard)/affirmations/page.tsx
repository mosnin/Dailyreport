"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import confetti from "canvas-confetti";
import {
  Plus,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Star,
  X,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const GOAL_ROUNDS = 5;
const today = () => new Date().toISOString().split("T")[0];

type Affirmation = {
  _id: Id<"affirmations">;
  text: string;
  source: "manual" | "ai";
};

// ── Round progress dots ───────────────────────────────────────────────────

function RoundDots({ completed, goal = GOAL_ROUNDS }: { completed: number; goal?: number }) {
  const display = Math.max(goal, completed);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {Array.from({ length: display }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-2.5 h-2.5 rounded-full transition-colors",
            i < completed
              ? i < goal
                ? "bg-amber-400"
                : "bg-amber-300"
              : "bg-neutral-200 dark:bg-neutral-700"
          )}
        />
      ))}
    </div>
  );
}

// ── Affirmation row ───────────────────────────────────────────────────────

function AffirmationRow({
  item,
  onRemove,
  onUpdateText,
}: {
  item: Affirmation;
  onRemove: () => void;
  onUpdateText: (t: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== item.text) onUpdateText(trimmed);
    else setDraft(item.text);
    setEditing(false);
  }

  return (
    <div className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/50 transition-colors">
      <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(item.text); setEditing(false); }
          }}
          className="flex-1 text-sm bg-transparent border-b border-primary focus:outline-none pb-0.5"
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className="flex-1 text-sm cursor-default select-none"
          title="Double-click to edit"
        >
          {item.text}
        </span>
      )}
      {item.source === "ai" && (
        <span className="text-[10px] text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          AI
        </span>
      )}
      <button
        onClick={onRemove}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Round flashcard mode ──────────────────────────────────────────────────

function RoundSession({
  affirmations,
  roundNumber,
  onComplete,
  onCancel,
}: {
  affirmations: Affirmation[];
  roundNumber: number;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        if (index < affirmations.length - 1) setIndex((i) => i + 1);
        else onComplete();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, affirmations.length, onComplete, onCancel]);

  const current = affirmations[index];
  const isLast = index === affirmations.length - 1;

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel round
        </button>
        <div className="text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Round {roundNumber}
          </span>
        </div>
        <span className="text-sm text-muted-foreground tabular-nums">
          {index + 1} / {affirmations.length}
        </span>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mb-8">
        {affirmations.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={cn(
              "h-1 rounded-full transition-all duration-200",
              i === index ? "w-6 bg-amber-400" : i < index ? "w-2 bg-amber-300" : "w-2 bg-neutral-200 dark:bg-neutral-700"
            )}
          />
        ))}
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-2">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 sm:p-12 text-center shadow-sm">
          <div className="mb-6">
            <Star className="w-5 h-5 text-amber-400 mx-auto" />
          </div>
          <p className="text-xl sm:text-2xl font-medium leading-relaxed text-foreground">
            {current?.text}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-8">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="p-2.5 rounded-full border border-border hover:bg-accent transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {isLast ? (
          <button
            onClick={onComplete}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-neutral-900 font-medium text-sm transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete round
          </button>
        ) : (
          <button
            onClick={() => setIndex((i) => i + 1)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-border hover:bg-accent text-sm font-medium transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => {
            if (index < affirmations.length - 1) setIndex((i) => i + 1);
            else onComplete();
          }}
          className="p-2.5 rounded-full border border-border hover:bg-accent transition-colors opacity-0 pointer-events-none"
          aria-hidden
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        ← → arrow keys to navigate · Enter to advance · Esc to cancel
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function AffirmationsPage() {
  const { convexUserId, isLoading } = useConvexUser();
  const todayStr = today();

  const affirmations = useQuery(
    api.affirmations.list,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const session = useQuery(
    api.affirmations.getTodaySession,
    convexUserId ? { userId: convexUserId, date: todayStr } : "skip"
  );

  const addAffirmation = useMutation(api.affirmations.add);
  const removeAffirmation = useMutation(api.affirmations.remove);
  const updateText = useMutation(api.affirmations.updateText);
  const recordRound = useMutation(api.affirmations.recordRound);
  const generateAffirmations = useAction(api.ai.generateAffirmations);

  const [inRound, setInRound] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [generating, setGenerating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const rounds = session?.rounds ?? 0;
  const goalMet = rounds >= GOAL_ROUNDS;

  async function handleCompleteRound() {
    if (!convexUserId) return;
    await recordRound({ userId: convexUserId, date: todayStr });
    setInRound(false);

    const newRounds = rounds + 1;
    if (newRounds >= GOAL_ROUNDS) {
      // Side cannon for hitting the goal
      const colors = ["#fbbf24", "#f59e0b", "#fcd34d"];
      const end = Date.now() + 2500;
      function frame() {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
      toast.success("5 rounds complete! Daily goal met.");
    } else {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 }, colors: ["#fbbf24", "#fcd34d", "#f59e0b"] });
      toast.success(`Round ${newRounds} complete!`);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const text = newText.trim();
    if (!text || !convexUserId) return;
    await addAffirmation({ userId: convexUserId, text, source: "manual" });
    setNewText("");
    inputRef.current?.focus();
  }

  async function handleGenerate() {
    if (!convexUserId || generating) return;
    setGenerating(true);
    try {
      const results = await generateAffirmations({ userId: convexUserId, count: 5 });
      if (Array.isArray(results) && results.length > 0) {
        for (const text of results as string[]) {
          if (text?.trim()) {
            await addAffirmation({ userId: convexUserId, text: text.trim(), source: "ai" });
          }
        }
        toast.success(`Added ${results.length} affirmations.`);
      } else {
        toast.error("Couldn't generate affirmations. Try adding more reports first.");
      }
    } catch {
      toast.error("Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-lg space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // ── Round mode ──────────────────────────────────────────────────────────

  if (inRound && affirmations && affirmations.length > 0) {
    return (
      <div className="max-w-lg mx-auto">
        <RoundSession
          affirmations={affirmations as Affirmation[]}
          roundNumber={rounds + 1}
          onComplete={handleCompleteRound}
          onCancel={() => setInRound(false)}
        />
      </div>
    );
  }

  // ── Main view ───────────────────────────────────────────────────────────

  return (
    <div className="max-w-lg space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Affirmations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Today's progress */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {goalMet && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              <span className="text-sm font-semibold">
                {goalMet ? "Daily goal complete" : "Today's progress"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold tabular-nums">{rounds}</span>
              <span className="text-sm text-muted-foreground">/ {GOAL_ROUNDS} rounds</span>
            </div>
          </div>
          <RoundDots completed={rounds} />
        </div>

        {affirmations && affirmations.length > 0 ? (
          <button
            onClick={() => setInRound(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-900 font-semibold text-sm transition-colors"
          >
            <Star className="w-4 h-4" />
            {rounds === 0
              ? "Start first round"
              : goalMet
              ? "Do another round"
              : `Start round ${rounds + 1}`}
          </button>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            Add affirmations below to begin.
          </p>
        )}
      </div>

      {/* Affirmation list */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-3">
          Your affirmations
        </p>

        {affirmations === undefined ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : affirmations.length === 0 && !adding ? (
          <div className="py-6 text-center space-y-2">
            <Star className="w-6 h-6 text-amber-400 mx-auto" />
            <p className="text-sm text-muted-foreground">
              No affirmations yet.{" "}
              <button
                onClick={() => setAdding(true)}
                className="text-primary underline-offset-2 hover:underline"
              >
                Add your first one
              </button>
              .
            </p>
          </div>
        ) : (
          (affirmations as Affirmation[]).map((item) => (
            <AffirmationRow
              key={item._id}
              item={item}
              onRemove={() => removeAffirmation({ id: item._id })}
              onUpdateText={(t) => updateText({ id: item._id, text: t })}
            />
          ))
        )}

        {adding ? (
          <form onSubmit={handleAdd} className="flex items-center gap-2 pt-2 px-2">
            <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <input
              ref={inputRef}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onBlur={() => { if (!newText.trim()) setAdding(false); }}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setAdding(false); setNewText(""); }
              }}
              placeholder="I am… / I have… / I can…"
              className="flex-1 text-sm bg-transparent border-b border-primary focus:outline-none pb-1"
            />
            <button
              type="submit"
              disabled={!newText.trim()}
              className="text-xs font-medium text-primary disabled:opacity-40"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setNewText(""); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2 px-2 w-full"
          >
            <Plus className="w-3.5 h-3.5" />
            Add affirmation
          </button>
        )}
      </div>

      {/* AI generate */}
      <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-500" />
            Generate with AI
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Craft 5 affirmations from your goals and reports.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50 shrink-0"
        >
          {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          {generating ? "Generating…" : "Generate"}
        </button>
      </div>
    </div>
  );
}
