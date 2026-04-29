"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  LayoutList,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Affirmation = {
  _id: Id<"affirmations">;
  text: string;
  source: "manual" | "ai";
};

// ── Flashcard Mode ────────────────────────────────────────────────────────────

function FlashcardMode({
  affirmations,
  onExit,
}: {
  affirmations: Affirmation[];
  onExit: () => void;
}) {
  const [deck, setDeck] = useState(() => [...affirmations]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  function shuffle() {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setIndex(0);
    setFlipped(false);
  }

  function prev() {
    setIndex((i) => Math.max(0, i - 1));
    setFlipped(false);
  }

  function next() {
    setIndex((i) => Math.min(deck.length - 1, i + 1));
    setFlipped(false);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setIndex((i) => Math.min(deck.length - 1, i + 1));
        setFlipped(false);
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setIndex((i) => Math.max(0, i - 1));
        setFlipped(false);
      }
      if (e.key === " ") { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === "Escape") onExit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deck.length, onExit]);

  const current = deck[index];
  if (!current) return null;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="w-full flex items-center justify-between">
        <button onClick={onExit} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" /> Exit flashcards
        </button>
        <span className="text-sm text-muted-foreground">{index + 1} / {deck.length}</span>
        <button onClick={shuffle} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Shuffle className="w-4 h-4" /> Shuffle
        </button>
      </div>

      <div
        className="w-full max-w-md cursor-pointer"
        onClick={() => setFlipped((f) => !f)}
        title="Click to flip"
      >
        <Card className="min-h-52 flex items-center justify-center p-6 select-none transition-all hover:shadow-lg">
          <CardContent className="p-0 text-center">
            {flipped ? (
              <p className="text-base font-medium leading-relaxed">{current.text}</p>
            ) : (
              <p className="text-4xl">🌟</p>
            )}
            {!flipped && (
              <p className="text-xs text-muted-foreground mt-4">Tap to reveal</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={prev}
          disabled={index === 0}
          className="p-2 rounded-full border border-border hover:bg-accent transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex gap-1.5">
          {deck.map((_, i) => (
            <button
              key={i}
              onClick={() => { setIndex(i); setFlipped(false); }}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                i === index ? "bg-primary" : "bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
        <button
          onClick={next}
          disabled={index === deck.length - 1}
          className="p-2 rounded-full border border-border hover:bg-accent transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Use ← → arrow keys to navigate · Space to flip · Esc to exit</p>
    </div>
  );
}

// ── Affirmation Row ───────────────────────────────────────────────────────────

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
      <span className="text-base shrink-0 select-none">✨</span>
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
        <span className="text-xs text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">AI</span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AffirmationsPage() {
  const { convexUserId, isLoading } = useConvexUser();
  const affirmations = useQuery(
    api.affirmations.list,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const addAffirmation = useMutation(api.affirmations.add);
  const removeAffirmation = useMutation(api.affirmations.remove);
  const updateText = useMutation(api.affirmations.updateText);
  const generateAffirmations = useAction(api.ai.generateAffirmations);

  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [flashcard, setFlashcard] = useState(false);
  const [generating, setGenerating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

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
        toast.success(`Generated ${results.length} affirmations.`);
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

  if (flashcard && affirmations && affirmations.length > 0) {
    return (
      <div className="max-w-lg pt-2">
        <FlashcardMode
          affirmations={affirmations as Affirmation[]}
          onExit={() => setFlashcard(false)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Affirmations</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Build and review your personal affirmations.
          </p>
        </div>
        {affirmations && affirmations.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFlashcard(true)}
            className="shrink-0 gap-1.5"
          >
            <LayoutList className="w-3.5 h-3.5" />
            Flashcards
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-4 space-y-1.5">
          {affirmations === undefined ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : affirmations.length === 0 && !adding ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-4xl">✨</p>
              <p className="text-sm text-muted-foreground">
                No affirmations yet.{" "}
                <button
                  onClick={() => setAdding(true)}
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Add your first one
                </button>{" "}
                or let AI generate them.
              </p>
            </div>
          ) : (
            <>
              {(affirmations as Affirmation[]).map((item) => (
                <AffirmationRow
                  key={item._id}
                  item={item}
                  onRemove={() => removeAffirmation({ id: item._id })}
                  onUpdateText={(t) => updateText({ id: item._id, text: t })}
                />
              ))}
            </>
          )}

          {/* Add form */}
          {adding ? (
            <form onSubmit={handleAdd} className="flex items-center gap-2 pt-1">
              <span className="text-base shrink-0">✨</span>
              <input
                ref={inputRef}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                onBlur={() => { if (!newText.trim()) setAdding(false); }}
                onKeyDown={(e) => { if (e.key === "Escape") { setAdding(false); setNewText(""); } }}
                placeholder="I am… / I have… / I can…"
                className="flex-1 text-sm bg-transparent border-b border-primary focus:outline-none pb-1"
              />
              <Button type="submit" size="sm" disabled={!newText.trim()}>Add</Button>
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
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-1 w-full"
            >
              <Plus className="w-3.5 h-3.5" />
              Add affirmation
            </button>
          )}
        </CardContent>
      </Card>

      {/* AI generate */}
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            AI-generated affirmations
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Let AI read your recent reports and goals to craft 5 personalized affirmations.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleGenerate}
          disabled={generating}
          className="shrink-0"
        >
          {generating ? "Generating…" : "Generate"}
        </Button>
      </div>
    </div>
  );
}
