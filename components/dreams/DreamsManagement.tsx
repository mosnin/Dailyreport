"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

type DreamCategory = "financial" | "health" | "relationships" | "other";

const CATEGORY_META: Record<DreamCategory, {
  label: string;
  emoji: string;
  color: string;
  ring: string;
  dot: string;
  placeholder: string;
}> = {
  financial: {
    label: "Financial",
    emoji: "💰",
    color: "text-emerald-600 dark:text-emerald-400",
    ring: "focus:ring-emerald-400/30",
    dot: "bg-emerald-400",
    placeholder: "e.g. Worth multiple millions, own my dream home…",
  },
  health: {
    label: "Health",
    emoji: "❤️",
    color: "text-rose-500 dark:text-rose-400",
    ring: "focus:ring-rose-400/30",
    dot: "bg-rose-400",
    placeholder: "e.g. Feel vibrant every day, run a marathon…",
  },
  relationships: {
    label: "Relationships",
    emoji: "🤝",
    color: "text-amber-500 dark:text-amber-400",
    ring: "focus:ring-amber-400/30",
    dot: "bg-amber-400",
    placeholder: "e.g. Deep friendships, a loving family…",
  },
  other: {
    label: "Other",
    emoji: "✨",
    color: "text-sky-500 dark:text-sky-400",
    ring: "focus:ring-sky-400/30",
    dot: "bg-sky-400",
    placeholder: "e.g. Travel the world, leave a lasting legacy…",
  },
};

const CATEGORIES: DreamCategory[] = ["financial", "health", "relationships", "other"];

// ── Single dream row ─────────────────────────────────────────────────────────

function DreamRow({
  dream,
  category,
  onRemove,
  onUpdate,
}: {
  dream: { _id: Id<"dreams">; title: string };
  category: DreamCategory;
  onRemove: () => void;
  onUpdate: (title: string) => void;
}) {
  const meta = CATEGORY_META[category];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(dream.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const t = draft.trim();
    if (t && t !== dream.title) onUpdate(t);
    else setDraft(dream.title);
    setEditing(false);
  }

  return (
    <div className="group flex items-start gap-2 py-1.5 px-1 rounded-lg hover:bg-muted/40 transition-colors">
      <span className={cn("mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 mt-1.5", meta.dot)} />
      {editing ? (
        <div className="flex-1 flex items-center gap-1.5">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") { setDraft(dream.title); setEditing(false); }
            }}
            className="flex-1 text-sm bg-transparent border-b border-primary focus:outline-none pb-0.5"
          />
          <button onClick={commit} className="text-emerald-500 hover:text-emerald-600">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => { setDraft(dream.title); setEditing(false); }} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className="flex-1 text-sm leading-snug cursor-default select-none"
        >
          {dream.title}
        </span>
      )}
      {!editing && (
        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)} className="p-0.5 text-muted-foreground hover:text-foreground">
            <Pencil className="w-3 h-3" />
          </button>
          <button onClick={onRemove} className="p-0.5 text-muted-foreground hover:text-destructive">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Category card ────────────────────────────────────────────────────────────

function DreamCategoryCard({
  category,
  dreams,
  onAdd,
  onRemove,
  onUpdate,
}: {
  category: DreamCategory;
  dreams: Array<{ _id: Id<"dreams">; title: string }>;
  onAdd: (title: string) => void;
  onRemove: (id: Id<"dreams">) => void;
  onUpdate: (id: Id<"dreams">, title: string) => void;
}) {
  const meta = CATEGORY_META[category];
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const t = newTitle.trim();
    if (!t) return;
    onAdd(t);
    setNewTitle("");
    inputRef.current?.focus();
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-base">{meta.emoji}</span>
        <h3 className={cn("text-sm font-semibold", meta.color)}>{meta.label}</h3>
        {dreams.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">{dreams.length}</span>
        )}
      </div>

      <div className="space-y-0.5 min-h-[20px]">
        {dreams.length === 0 && !adding && (
          <p className="text-xs text-muted-foreground/60 italic">No {meta.label.toLowerCase()} dreams yet.</p>
        )}
        {dreams.map((d) => (
          <DreamRow
            key={d._id}
            dream={d}
            category={category}
            onRemove={() => onRemove(d._id)}
            onUpdate={(title) => onUpdate(d._id, title)}
          />
        ))}
      </div>

      {adding ? (
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={() => { if (!newTitle.trim()) setAdding(false); }}
            onKeyDown={(e) => { if (e.key === "Escape") { setAdding(false); setNewTitle(""); } }}
            placeholder={meta.placeholder}
            className={cn(
              "flex-1 text-sm bg-transparent border-b border-primary focus:outline-none pb-1 placeholder:text-muted-foreground/50",
              meta.ring
            )}
          />
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="text-xs font-medium text-primary disabled:opacity-40"
          >
            Add
          </button>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium transition-colors",
            meta.color,
            "opacity-60 hover:opacity-100"
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          Add dream
        </button>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export function DreamsManagement({ userId }: { userId: Id<"users"> }) {
  const all = useQuery(api.dreams.list, { userId });
  const addDream = useMutation(api.dreams.add);
  const removeDream = useMutation(api.dreams.remove);
  const updateTitle = useMutation(api.dreams.updateTitle);

  if (all === undefined) return null;
  if (all === null) return null;

  const byCategory = CATEGORIES.reduce<Record<DreamCategory, typeof all>>((acc, cat) => {
    acc[cat] = (all ?? []).filter((d) => d.category === cat);
    return acc;
  }, {} as Record<DreamCategory, typeof all>);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">My Dreams</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your big life visions — the foundation everything else is built on.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CATEGORIES.map((cat) => (
          <DreamCategoryCard
            key={cat}
            category={cat}
            dreams={byCategory[cat]}
            onAdd={(title) => addDream({ userId, category: cat, title })}
            onRemove={(dreamId) => removeDream({ dreamId })}
            onUpdate={(dreamId, title) => updateTitle({ dreamId, title })}
          />
        ))}
      </div>
    </div>
  );
}
