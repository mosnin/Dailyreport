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
  Flame,
  Bookmark,
  BookmarkCheck,
  X,
  CheckCircle2,
  Loader2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const GOAL_ROUNDS = 5;
const today = () => new Date().toISOString().split("T")[0];

type AffirmationSource = "manual" | "ai" | "saved";

type Affirmation = {
  _id: Id<"affirmations">;
  text: string;
  source: AffirmationSource;
};

// ── Progress ring ─────────────────────────────────────────────────────────

function ProgressRing({ current, total }: { current: number; total: number }) {
  const size = 56;
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 1 ? current / (total - 1) : 1;
  const offset = circumference - progress * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor" strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-amber-400 transition-all duration-300"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums">
        {current + 1}/{total}
      </span>
    </div>
  );
}

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
              ? i < goal ? "bg-amber-400" : "bg-amber-300"
              : "bg-neutral-200 dark:bg-neutral-700"
          )}
        />
      ))}
    </div>
  );
}

// ── Editable affirmation row ──────────────────────────────────────────────

function AffirmationRow({
  item,
  onRemove,
  onUpdateText,
  onMoveToSaved,
  onMoveToPool,
  isSaved,
}: {
  item: Affirmation;
  onRemove: () => void;
  onUpdateText: (t: string) => void;
  onMoveToSaved?: () => void;
  onMoveToPool?: () => void;
  isSaved: boolean;
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
    <div className="group flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-muted/50 transition-colors">
      {isSaved ? (
        <Bookmark className="w-4 h-4 text-sky-400 shrink-0 fill-sky-400" />
      ) : (
        <Flame className="w-4 h-4 text-amber-400 shrink-0" />
      )}

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
          className="flex-1 text-sm cursor-default select-none leading-snug"
        >
          {item.text}
        </span>
      )}

      <div className="shrink-0 flex items-center gap-0.5">
        {!isSaved && onMoveToSaved && (
          <button
            onClick={onMoveToSaved}
            className="p-1 text-muted-foreground hover:text-sky-500 transition-colors"
            title="Save permanently (don't use in rounds)"
          >
            <Bookmark className="w-4 h-4" />
          </button>
        )}
        {isSaved && onMoveToPool && (
          <button
            onClick={onMoveToPool}
            className="p-1 text-muted-foreground hover:text-amber-500 transition-colors"
            title="Move back to practice pool"
          >
            <Flame className="w-4 h-4" />
          </button>
        )}
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onRemove}
          className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
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
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel round
        </button>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Round {roundNumber}
        </span>
        {/* Progress ring replaces plain text counter */}
        <ProgressRing current={index} total={affirmations.length} />
      </div>

      <div className="flex justify-center gap-1.5 mb-8">
        {affirmations.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={cn(
              "h-1.5 rounded-full transition-all duration-200",
              i === index ? "w-6 bg-amber-400" : i < index ? "w-2 bg-amber-300" : "w-2 bg-neutral-200 dark:bg-neutral-700"
            )}
          />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center px-2">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 sm:p-12 text-center shadow-sm">
          <div className="mb-6">
            <Flame className="w-7 h-7 text-amber-400 mx-auto" />
          </div>
          <p className="text-xl sm:text-2xl font-medium leading-relaxed text-foreground">
            {current?.text}
          </p>
        </div>
      </div>

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

        <button aria-hidden className="p-2.5 rounded-full opacity-0 pointer-events-none">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        ← → arrow keys to navigate · Enter to advance · Esc to cancel
      </p>
    </div>
  );
}

// ── Recap screen ──────────────────────────────────────────────────────────

function RecapScreen({ rounds, count, onContinue }: { rounds: number; count: number; onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center gap-8 max-w-sm mx-auto">
      <div className="w-20 h-20 rounded-full bg-amber-400/15 flex items-center justify-center">
        <Flame className="w-10 h-10 text-amber-400" />
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-2">Daily goal complete!</h2>
        <p className="text-muted-foreground text-sm">
          You finished {GOAL_ROUNDS} rounds of affirmations today. Keep the momentum going.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-6 w-full">
        <div className="text-center">
          <div className="text-3xl font-bold tabular-nums">{count}</div>
          <div className="text-xs text-muted-foreground mt-1">Affirmations</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold tabular-nums">{rounds}</div>
          <div className="text-xs text-muted-foreground mt-1">Rounds</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold tabular-nums">{count * rounds}</div>
          <div className="text-xs text-muted-foreground mt-1">Reps</div>
        </div>
      </div>
      <button
        onClick={onContinue}
        className="px-8 py-3 rounded-full border border-border hover:bg-accent text-sm font-medium transition-colors"
      >
        Continue
      </button>
    </div>
  );
}

// ── Inline add row ────────────────────────────────────────────────────────

function AddRow({
  placeholder,
  onAdd,
  icon: Icon,
  iconClass,
}: {
  placeholder: string;
  onAdd: (text: string) => void;
  icon: React.ElementType;
  iconClass: string;
}) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) ref.current?.focus();
  }, [adding]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    onAdd(t);
    setText("");
    ref.current?.focus();
  }

  if (adding) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-2 px-2">
        <Icon className={cn("w-4 h-4 shrink-0", iconClass)} />
        <input
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => { if (!text.trim()) setAdding(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") { setAdding(false); setText(""); } }}
          placeholder={placeholder}
          className="flex-1 text-sm bg-transparent border-b border-primary focus:outline-none pb-1"
        />
        <button type="submit" disabled={!text.trim()} className="text-xs font-medium text-primary disabled:opacity-40">
          Add
        </button>
        <button type="button" onClick={() => { setAdding(false); setText(""); }} className="text-xs text-muted-foreground hover:text-foreground">
          Cancel
        </button>
      </form>
    );
  }

  return (
    <button
      onClick={() => setAdding(true)}
      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2 px-2 w-full"
    >
      <Plus className="w-4 h-4" />
      Add affirmation
    </button>
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

  const addAffirmation = useMutation(api.affirmations.add).withOptimisticUpdate(
    (localStore, args) => {
      if (!convexUserId) return;
      const current = localStore.getQuery(api.affirmations.list, { userId: convexUserId });
      if (current === undefined) return;
      const tempId = `optimistic-${Date.now()}` as Id<"affirmations">;
      localStore.setQuery(api.affirmations.list, { userId: convexUserId }, [
        ...current,
        { _id: tempId, _creationTime: Date.now(), userId: convexUserId, text: args.text, source: args.source, createdAt: Date.now() },
      ]);
    }
  );
  const removeAffirmation = useMutation(api.affirmations.remove).withOptimisticUpdate(
    (localStore, args) => {
      if (!convexUserId) return;
      const current = localStore.getQuery(api.affirmations.list, { userId: convexUserId });
      if (current === undefined) return;
      localStore.setQuery(
        api.affirmations.list,
        { userId: convexUserId },
        current.filter((a) => a._id !== args.id)
      );
    }
  );
  const updateText = useMutation(api.affirmations.updateText).withOptimisticUpdate(
    (localStore, args) => {
      if (!convexUserId) return;
      const current = localStore.getQuery(api.affirmations.list, { userId: convexUserId });
      if (current === undefined) return;
      localStore.setQuery(
        api.affirmations.list,
        { userId: convexUserId },
        current.map((a) => a._id === args.id ? { ...a, text: args.text } : a)
      );
    }
  );
  const updateSource = useMutation(api.affirmations.updateSource).withOptimisticUpdate(
    (localStore, args) => {
      if (!convexUserId) return;
      const current = localStore.getQuery(api.affirmations.list, { userId: convexUserId });
      if (current === undefined) return;
      localStore.setQuery(
        api.affirmations.list,
        { userId: convexUserId },
        current.map((a) => a._id === args.id ? { ...a, source: args.source } : a)
      );
    }
  );
  const recordRound = useMutation(api.affirmations.recordRound).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.affirmations.getTodaySession, { userId: args.userId, date: args.date });
      if (current === undefined) return;
      if (current === null) {
        localStore.setQuery(api.affirmations.getTodaySession, { userId: args.userId, date: args.date }, {
          _id: `optimistic-${Date.now()}` as Id<"affirmationSessions">,
          _creationTime: Date.now(),
          userId: args.userId,
          date: args.date,
          rounds: 1,
        });
      } else {
        localStore.setQuery(api.affirmations.getTodaySession, { userId: args.userId, date: args.date }, {
          ...current,
          rounds: current.rounds + 1,
        });
      }
    }
  );
  const generateAffirmations = useAction(api.ai.generateAffirmations);

  const [inRound, setInRound] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [generating, setGenerating] = useState(false);

  const rounds = session?.rounds ?? 0;
  const goalMet = rounds >= GOAL_ROUNDS;

  const savedList = (affirmations ?? []).filter((a) => a.source === "saved") as Affirmation[];
  const practiceList = (affirmations ?? []).filter((a) => a.source !== "saved") as Affirmation[];

  async function handleCompleteRound() {
    if (!convexUserId) return;
    await recordRound({ userId: convexUserId, date: todayStr });
    setInRound(false);
    const newRounds = rounds + 1;
    if (newRounds >= GOAL_ROUNDS) {
      const colors = ["#fbbf24", "#f59e0b", "#fcd34d"];
      const end = Date.now() + 2500;
      function frame() {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
      toast.success("5 rounds complete! Daily goal met.");
      setShowRecap(true);
    } else {
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 }, colors: ["#fbbf24", "#fcd34d", "#f59e0b"] });
      toast.success(`Round ${newRounds} complete!`);
    }
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
        toast.success(`Added ${results.length} affirmations to your practice pool.`);
      } else {
        toast.error("Couldn't generate affirmations. Try adding more reports or dreams first.");
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

  if (inRound && practiceList.length > 0) {
    return (
      <div className="max-w-lg mx-auto">
        <RoundSession
          affirmations={practiceList}
          roundNumber={rounds + 1}
          onComplete={handleCompleteRound}
          onCancel={() => setInRound(false)}
        />
      </div>
    );
  }

  if (showRecap) {
    return (
      <div className="max-w-lg mx-auto">
        <RecapScreen
          rounds={rounds}
          count={practiceList.length}
          onContinue={() => setShowRecap(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Affirmations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* ── Saved affirmations ── */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
        <div className="flex items-center gap-2 px-2 mb-3">
          <BookmarkCheck className="w-4 h-4 text-sky-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Saved affirmations
          </p>
        </div>
        <p className="text-xs text-muted-foreground/60 px-2 mb-3">
          Personal affirmations you keep as a permanent reference. Not used in practice rounds.
        </p>

        {affirmations === undefined ? (
          <div className="space-y-2">
            {[0, 1].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : savedList.length === 0 ? (
          <p className="text-xs text-muted-foreground/50 italic px-2">None saved yet. Bookmark any affirmation to save it here.</p>
        ) : (
          savedList.map((item) => (
            <AffirmationRow
              key={item._id}
              item={item}
              isSaved
              onRemove={() => removeAffirmation({ id: item._id })}
              onUpdateText={(t) => updateText({ id: item._id, text: t })}
              onMoveToPool={() => updateSource({ id: item._id, source: "manual" })}
            />
          ))
        )}

        <AddRow
          placeholder="I am so happy and grateful that I am…"
          onAdd={(text) => addAffirmation({ userId: convexUserId, text, source: "saved" })}
          icon={Bookmark}
          iconClass="text-sky-400"
        />
      </div>

      {/* ── Today's practice ── */}
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

        {practiceList.length > 0 ? (
          <button
            onClick={() => goalMet ? setShowRecap(true) : setInRound(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-neutral-900 font-semibold text-sm transition-colors"
          >
            <Flame className="w-4 h-4" />
            {rounds === 0 ? "Start first round" : goalMet ? "View recap" : `Start round ${rounds + 1}`}
          </button>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            Add affirmations to your practice pool below to begin.
          </p>
        )}
      </div>

      {/* ── Practice pool ── */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1">
          Practice pool
        </p>
        <p className="text-xs text-muted-foreground/60 px-2 mb-3">
          These cycle through your daily rounds. Use the{" "}
          <Bookmark className="inline w-3 h-3" /> icon to move one to Saved.
        </p>

        {affirmations === undefined ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : practiceList.length === 0 && (
          <div className="py-4 text-center space-y-2">
            <Flame className="w-7 h-7 text-amber-400 mx-auto" />
            <p className="text-sm text-muted-foreground">No practice affirmations yet.</p>
          </div>
        )}

        {practiceList.map((item) => (
          <AffirmationRow
            key={item._id}
            item={item}
            isSaved={false}
            onRemove={() => removeAffirmation({ id: item._id })}
            onUpdateText={(t) => updateText({ id: item._id, text: t })}
            onMoveToSaved={() => updateSource({ id: item._id, source: "saved" })}
          />
        ))}

        <AddRow
          placeholder="I am… / I have… / I can…"
          onAdd={(text) => addAffirmation({ userId: convexUserId, text, source: "manual" })}
          icon={Flame}
          iconClass="text-amber-400"
        />
      </div>

      {/* AI generate */}
      <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-sky-500" />
            Generate with AI
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Craft 5 affirmations from your dreams — added to your practice pool.
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50 shrink-0"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {generating ? "Generating…" : "Generate"}
        </button>
      </div>
    </div>
  );
}
