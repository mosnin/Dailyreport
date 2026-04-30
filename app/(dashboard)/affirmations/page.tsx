"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { todayString } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Flame,
  Star,
  X,
  CheckCircle2,
  Loader2,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp } from "@/lib/motion";
import { StagingArea } from "@/components/affirmations/StagingArea";

const GOAL_ROUNDS = 5;

type AffirmationSource = "manual" | "ai" | "saved";

type Affirmation = {
  _id: Id<"affirmations">;
  text: string;
  source: AffirmationSource;
};

type StagingItem = {
  id: string;
  text: string;
  status: "pending" | "accepted" | "dismissed";
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
        <motion.div
          key={i}
          initial={i < completed ? { scale: 0 } : false}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200, delay: i * 0.04 }}
          className={cn(
            "w-2.5 h-2.5 rounded-full transition-colors",
            i < completed
              ? i < goal ? "bg-amber-400" : "bg-amber-300"
              : "bg-background/15"
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
  onTogglePin,
}: {
  item: Affirmation;
  onRemove: () => void;
  onUpdateText: (t: string) => void;
  onTogglePin: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);

  const isPinned = item.source === "saved";
  const isAI = item.source === "ai";

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
    <div className="group flex items-center gap-2.5 rounded-xl px-2 py-2.5 hover:bg-muted/50 transition-colors">
      <motion.button
        whileTap={{ scale: 0.75 }}
        onClick={onTogglePin}
        className={cn(
          "shrink-0 transition-colors",
          isPinned ? "text-amber-400" : "text-muted-foreground/25 hover:text-muted-foreground/60"
        )}
        title={isPinned ? "Unpin" : "Pin to top"}
      >
        <Star className={cn("w-4 h-4", isPinned && "fill-amber-400")} />
      </motion.button>

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
          className="flex-1 text-sm leading-snug cursor-default select-none"
        >
          {item.text}
        </span>
      )}

      {isAI && (
        <span className="text-[10px] font-medium bg-sky-500/10 text-sky-500 dark:text-sky-400 rounded-full px-1.5 py-0.5 shrink-0 leading-none">
          AI
        </span>
      )}

      <div className="shrink-0 flex items-center gap-0.5">
        {!editing && (
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setEditing(true)}
            className="p-1 text-muted-foreground/30 hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </motion.button>
        )}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onRemove}
          className="p-1 text-muted-foreground/40 hover:text-destructive transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </div>
  );
}

// ── Round flashcard mode ──────────────────────────────────────────────────

const slideVariants = {
  enter: (dir: number) => ({ x: dir * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir * -48, opacity: 0 }),
};

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
  const [direction, setDirection] = useState(0);

  function goNext() {
    if (index < affirmations.length - 1) {
      setDirection(1);
      setIndex((i) => i + 1);
    } else {
      onComplete();
    }
  }

  function goPrev() {
    setDirection(-1);
    setIndex((i) => Math.max(0, i - 1));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        goNext();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      }
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, affirmations.length]);

  const current = affirmations[index];
  const isLast = index === affirmations.length - 1;

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-6">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel round
        </motion.button>
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Round {roundNumber}
        </span>
        <ProgressRing current={index} total={affirmations.length} />
      </div>

      <div className="flex justify-center gap-1.5 mb-8">
        {affirmations.map((_, i) => (
          <motion.button
            key={i}
            whileTap={{ scale: 0.85 }}
            onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
            className={cn(
              "h-1.5 rounded-full transition-all duration-200",
              i === index ? "w-6 bg-amber-400" : i < index ? "w-2 bg-amber-300" : "w-2 bg-neutral-200 dark:bg-neutral-700"
            )}
          />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center px-2 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={index}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-8 sm:p-12 text-center"
          >
            <div className="mb-6">
              <Flame className="w-7 h-7 text-amber-400 mx-auto" />
            </div>
            <p className="text-xl sm:text-2xl font-medium leading-relaxed text-foreground">
              {current?.text}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-4 mt-8">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={goPrev}
          disabled={index === 0}
          className="p-2.5 rounded-full border border-border hover:bg-accent transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>

        {isLast ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onComplete}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-neutral-900 font-medium text-sm transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Complete round
          </motion.button>
        ) : (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={goNext}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full border border-border hover:bg-accent text-sm font-medium transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </motion.button>
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

function RecapScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center gap-6 max-w-sm mx-auto">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 14, stiffness: 100 }}
      >
        <Flame className="w-8 h-8 text-amber-400" />
      </motion.div>
      <motion.p {...fadeUp(0.18)} className="font-heading italic text-2xl leading-relaxed text-foreground">
        Five rounds done.
      </motion.p>
      <motion.p {...fadeUp(0.28)} className="text-sm text-muted-foreground/70 max-w-xs">
        The words are in you now. Let them work.
      </motion.p>
      <motion.button
        {...fadeUp(0.38)}
        whileTap={{ scale: 0.97 }}
        onClick={onContinue}
        className="mt-4 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        Continue →
      </motion.button>
    </div>
  );
}

// ── Inline add row ────────────────────────────────────────────────────────

function AddRow({
  onAdd,
}: {
  onAdd: (text: string) => void;
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
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-2 py-2.5">
        <Plus className="w-4 h-4 shrink-0 text-muted-foreground/40" />
        <input
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => { if (!text.trim()) setAdding(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") { setAdding(false); setText(""); } }}
          placeholder="I am… / I have… / I can…"
          className="flex-1 text-sm bg-transparent border-b border-primary focus:outline-none pb-0.5"
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
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => setAdding(true)}
      className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-2.5 w-full"
    >
      <Plus className="w-4 h-4" />
      Add affirmation
    </motion.button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function AffirmationsPage() {
  const { convexUserId, isLoading } = useConvexUser();
  const todayStr = todayString();

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
      localStore.setQuery(api.affirmations.list, { userId: convexUserId }, current.filter((a) => a._id !== args.id));
    }
  );
  const updateText = useMutation(api.affirmations.updateText).withOptimisticUpdate(
    (localStore, args) => {
      if (!convexUserId) return;
      const current = localStore.getQuery(api.affirmations.list, { userId: convexUserId });
      if (current === undefined) return;
      localStore.setQuery(api.affirmations.list, { userId: convexUserId }, current.map((a) => a._id === args.id ? { ...a, text: args.text } : a));
    }
  );
  const updateSource = useMutation(api.affirmations.updateSource).withOptimisticUpdate(
    (localStore, args) => {
      if (!convexUserId) return;
      const current = localStore.getQuery(api.affirmations.list, { userId: convexUserId });
      if (current === undefined) return;
      localStore.setQuery(api.affirmations.list, { userId: convexUserId }, current.map((a) => a._id === args.id ? { ...a, source: args.source } : a));
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
        localStore.setQuery(api.affirmations.getTodaySession, { userId: args.userId, date: args.date }, { ...current, rounds: current.rounds + 1 });
      }
    }
  );
  const generateAffirmations = useAction(api.ai.generateAffirmations);

  const [inRound, setInRound] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [staging, setStaging] = useState<StagingItem[]>([]);

  const rounds = session?.rounds ?? 0;
  const goalMet = rounds >= GOAL_ROUNDS;

  const sorted = [...((affirmations ?? []) as Affirmation[])].sort((a, b) => {
    const rank = (s: AffirmationSource) => s === "saved" ? 0 : s === "manual" ? 1 : 2;
    return rank(a.source) - rank(b.source);
  });

  async function handleCompleteRound() {
    if (!convexUserId) return;
    await recordRound({ userId: convexUserId, date: todayStr });
    setInRound(false);
    const newRounds = rounds + 1;
    if (newRounds >= GOAL_ROUNDS) {
      setShowRecap(true);
    } else {
      toast.success(`Round ${newRounds} done.`);
    }
  }

  async function handleGenerate() {
    if (!convexUserId || generating || staging.length > 0) return;
    setGenerating(true);
    try {
      const results = await generateAffirmations({ userId: convexUserId, count: 5 });
      if (Array.isArray(results) && results.length > 0) {
        const items: StagingItem[] = (results as string[])
          .map((text, i) => ({
            id: `s-${Date.now()}-${i}`,
            text: String(text).trim(),
            status: "pending" as const,
          }))
          .filter((s) => s.text.length > 0);
        if (items.length > 0) {
          setStaging(items);
        } else {
          toast.error("Couldn't generate affirmations. Try adding more reports first.");
        }
      } else {
        toast.error("Couldn't generate affirmations. Try adding more reports first.");
      }
    } catch {
      toast.error("Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleAccept(id: string) {
    if (!convexUserId) return;
    const item = staging.find((s) => s.id === id);
    if (!item) return;
    try {
      await addAffirmation({ userId: convexUserId, text: item.text, source: "ai" });
      setStaging((prev) => prev.map((s) => s.id === id ? { ...s, status: "accepted" } : s));
    } catch {
      toast.error("Couldn't save. Try again.");
    }
  }

  function handleDismiss(id: string) {
    setStaging((prev) => prev.map((s) => s.id === id ? { ...s, status: "dismissed" } : s));
  }

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-lg space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (inRound && sorted.length > 0) {
    return (
      <div className="max-w-lg mx-auto">
        <RoundSession
          affirmations={sorted}
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
        <RecapScreen onContinue={() => setShowRecap(false)} />
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Header */}
      <motion.div {...fadeUp(0)}>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">Affirmations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </motion.div>

      {/* Practice hero */}
      <motion.div
        {...fadeUp(0.06)}
        className={cn(
          "rounded-2xl p-6 space-y-4",
          goalMet
            ? "bg-emerald-500/10 border border-emerald-500/20"
            : "bg-foreground text-background"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className={cn(
                "text-[11px] font-semibold tracking-[0.16em] uppercase",
                goalMet ? "text-emerald-600 dark:text-emerald-400" : "text-background/50"
              )}
            >
              {goalMet ? "Daily goal complete" : "Today's practice"}
            </p>
            <div className="flex items-end gap-2 mt-2">
              <span
                className={cn(
                  "text-4xl font-bold tabular-nums leading-none",
                  goalMet ? "text-foreground" : "text-background"
                )}
              >
                {rounds}
              </span>
              <span
                className={cn(
                  "text-sm mb-1",
                  goalMet ? "text-muted-foreground" : "text-background/50"
                )}
              >
                / {GOAL_ROUNDS} rounds
              </span>
            </div>
            {sorted.length > 0 && (
              <p
                className={cn(
                  "text-xs mt-1.5",
                  goalMet ? "text-muted-foreground/70" : "text-background/40"
                )}
              >
                {sorted.length} affirmation{sorted.length === 1 ? "" : "s"} in rotation
              </p>
            )}
          </div>
          <RoundDots completed={rounds} goal={GOAL_ROUNDS} />
        </div>

        {goalMet ? (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowRecap(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            All done — view recap
          </motion.button>
        ) : sorted.length > 0 ? (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setInRound(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-background text-foreground hover:bg-background/90 font-semibold text-sm transition-colors"
          >
            <Flame className="w-4 h-4" />
            {rounds === 0 ? "Begin practice" : `Start round ${rounds + 1}`}
          </motion.button>
        ) : (
          <p className="text-sm text-background/40 text-center py-1">
            Add affirmations below to begin
          </p>
        )}
      </motion.div>

      {/* Staging area */}
      <AnimatePresence>
        {staging.length > 0 && (
          <StagingArea
            key="staging"
            items={staging}
            onAccept={handleAccept}
            onDismiss={handleDismiss}
            onDone={() => setStaging([])}
          />
        )}
      </AnimatePresence>

      {/* Your affirmations */}
      <motion.section {...fadeUp(0.12)}>
        <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/40 mb-3">
          Your affirmations
        </p>
        <div className="rounded-2xl border border-border bg-card p-4 space-y-1">
          {affirmations === undefined ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-6 text-center">
              <Star className="w-7 h-7 text-amber-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No affirmations yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Add one below or generate with AI
              </p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {sorted.map((item) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -16, transition: { duration: 0.18 } }}
                  layout
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <AffirmationRow
                    item={item}
                    onRemove={() => removeAffirmation({ id: item._id })}
                    onUpdateText={(t) => updateText({ id: item._id, text: t })}
                    onTogglePin={() => updateSource({
                      id: item._id,
                      source: item.source === "saved" ? "manual" : "saved",
                    })}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          <AddRow
            onAdd={(text) => addAffirmation({ userId: convexUserId, text, source: "manual" })}
          />
        </div>
      </motion.section>

      {/* Generate with AI */}
      <motion.div {...fadeUp(0.18)} className="flex justify-center pt-1">
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleGenerate}
          disabled={generating || staging.length > 0}
          className="flex items-center gap-1.5 mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {generating ? "Generating…" : "Generate with AI"}
        </motion.button>
      </motion.div>
    </div>
  );
}
