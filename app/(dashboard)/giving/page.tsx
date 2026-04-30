"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, todayString } from "@/lib/utils";
import { Heart, Plus, Trash2, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp, listVariants, itemVariants } from "@/lib/motion";

// ── Types ─────────────────────────────────────────────────────────────────

type Entry = {
  _id: Id<"givingEntries">;
  text: string;
  date: string;
  createdAt: number;
};

// ── Individual entry row ──────────────────────────────────────────────────

function EntryRow({
  entry,
  onRemove,
  onUpdateText,
}: {
  entry: Entry;
  onRemove: () => void;
  onUpdateText: (t: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== entry.text) onUpdateText(trimmed);
    else setDraft(entry.text);
    setEditing(false);
  }

  return (
    <div className="group flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-muted/50 transition-colors">
      <Heart className="w-4 h-4 text-rose-400 shrink-0 fill-rose-400/30" />

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setDraft(entry.text); setEditing(false); }
          }}
          className="flex-1 text-sm bg-transparent border-b border-primary focus:outline-none pb-0.5"
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className="flex-1 text-sm cursor-default select-none leading-snug"
        >
          {entry.text}
        </span>
      )}

      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="p-1 text-muted-foreground hover:text-foreground"
            title="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={onRemove}
          className="p-1 text-muted-foreground hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Inline add row ────────────────────────────────────────────────────────

function AddRow({ onAdd }: { onAdd: (text: string) => void }) {
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
      <form onSubmit={handleSubmit} className="flex items-center gap-2.5 px-2 py-2">
        <Heart className="w-4 h-4 text-rose-400/40 shrink-0" />
        <input
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => { if (!text.trim()) setAdding(false); }}
          onKeyDown={(e) => { if (e.key === "Escape") { setAdding(false); setText(""); } }}
          placeholder="How did you give or add value today?"
          className="flex-1 text-sm bg-transparent border-b border-primary focus:outline-none pb-0.5 placeholder:text-muted-foreground/50"
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
      className="flex items-center gap-2.5 px-2 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
    >
      <Plus className="w-4 h-4" />
      Add entry
    </button>
  );
}

// ── Date section ──────────────────────────────────────────────────────────

function dateLabel(date: string, todayStr: string): string {
  if (date === todayStr) return "Today";
  const yesterday = new Date(todayStr);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date === yesterday.toISOString().split("T")[0]) return "Yesterday";
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ── Past day summary row (read-only) ─────────────────────────────────────

function PastDaySection({
  date,
  entries,
  todayStr,
}: {
  date: string;
  entries: Entry[];
  todayStr: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-medium">{dateLabel(date, todayStr)}</span>
          <span className="text-xs text-muted-foreground">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", expanded && "rotate-90")} />
      </button>
      {expanded && (
        <div className="px-2 pb-2 border-t border-border bg-muted/20 space-y-0.5 pt-1">
          {entries.map((e) => (
            <div key={e._id} className="flex items-center gap-2.5 px-2 py-1.5">
              <Heart className="w-4 h-4 text-rose-400 shrink-0 fill-rose-400/30" />
              <span className="text-sm text-muted-foreground leading-snug">{e.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Date navigator ────────────────────────────────────────────────────────

function offsetDate(base: string, days: number): string {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function GivingPage() {
  const { convexUserId, isLoading } = useConvexUser();
  const todayStr = todayString();
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const entries = useQuery(
    api.giving.listByDate,
    convexUserId ? { userId: convexUserId, date: selectedDate } : "skip"
  );
  const recent = useQuery(
    api.giving.listRecent,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  const addEntry = useMutation(api.giving.add).withOptimisticUpdate((localStore, args) => {
    if (!convexUserId) return;
    const current = localStore.getQuery(api.giving.listByDate, { userId: convexUserId, date: args.date });
    if (current === undefined) return;
    const tempId = `optimistic-${Date.now()}` as Id<"givingEntries">;
    localStore.setQuery(api.giving.listByDate, { userId: convexUserId, date: args.date }, [
      ...current,
      { _id: tempId, _creationTime: Date.now(), userId: convexUserId, date: args.date, text: args.text, createdAt: Date.now() },
    ]);
  });

  const removeEntry = useMutation(api.giving.remove).withOptimisticUpdate((localStore, args) => {
    if (!convexUserId) return;
    const current = localStore.getQuery(api.giving.listByDate, { userId: convexUserId, date: selectedDate });
    if (current === undefined) return;
    localStore.setQuery(
      api.giving.listByDate,
      { userId: convexUserId, date: selectedDate },
      current.filter((e) => e._id !== args.id)
    );
  });

  const updateText = useMutation(api.giving.updateText).withOptimisticUpdate((localStore, args) => {
    if (!convexUserId) return;
    const current = localStore.getQuery(api.giving.listByDate, { userId: convexUserId, date: selectedDate });
    if (current === undefined) return;
    localStore.setQuery(
      api.giving.listByDate,
      { userId: convexUserId, date: selectedDate },
      current.map((e) => e._id === args.id ? { ...e, text: args.text } : e)
    );
  });

  async function handleAdd(text: string) {
    if (!convexUserId) return;
    try {
      await addEntry({ userId: convexUserId, date: selectedDate, text });
    } catch {
      toast.error("Failed to add entry.");
    }
  }

  // Group recent entries by date for the history section (skip selected date)
  const pastGroups: Record<string, Entry[]> = {};
  if (recent) {
    for (const e of recent) {
      if (e.date === selectedDate) continue;
      if (!pastGroups[e.date]) pastGroups[e.date] = [];
      pastGroups[e.date].push(e as Entry);
    }
  }
  const pastDates = Object.keys(pastGroups).sort((a, b) => b.localeCompare(a)).slice(0, 13);

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-lg space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isToday = selectedDate === todayStr;
  const canGoForward = selectedDate < todayStr;

  return (
    <div className="max-w-lg space-y-6">
      {/* Header */}
      <motion.div {...fadeUp(0)}>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">Giving</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track the value you create and give each day.
        </p>
      </motion.div>

      {/* Date navigator */}
      <motion.div {...fadeUp(0.08)} className="flex items-center gap-2 justify-center">
        <button
          onClick={() => setSelectedDate(offsetDate(selectedDate, -1))}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium min-w-[160px] text-center">
          {dateLabel(selectedDate, todayStr)}
        </span>
        <button
          onClick={() => setSelectedDate(offsetDate(selectedDate, 1))}
          disabled={!canGoForward}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {!isToday && (
          <button
            onClick={() => setSelectedDate(todayStr)}
            className="text-xs text-primary hover:underline ml-1"
          >
            Today
          </button>
        )}
      </motion.div>

      {/* Today / Selected day entries */}
      <motion.div {...fadeUp(0.13)} className="rounded-2xl border border-border bg-card p-4 space-y-0.5">
        <div className="flex items-center gap-2 px-2 mb-3">
          <Heart className="w-4 h-4 text-rose-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {isToday ? "Today's giving" : dateLabel(selectedDate, todayStr)}
          </p>
          {entries && entries.length > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">{entries.length} {entries.length === 1 ? "entry" : "entries"}</span>
          )}
        </div>

        {entries === undefined ? (
          <div className="space-y-2 px-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground/60 italic px-2 py-1">
            {isToday ? "Nothing yet — how have you given value today?" : "No entries for this day."}
          </p>
        ) : (
          <AnimatePresence initial={false}>
            <motion.div
              className="space-y-0.5"
              variants={listVariants}
              initial="hidden"
              animate="visible"
            >
              {(entries as Entry[]).map((e) => (
                <motion.div key={e._id} variants={itemVariants}>
                  <EntryRow
                    entry={e}
                    onRemove={() => removeEntry({ id: e._id })}
                    onUpdateText={(t) => updateText({ id: e._id, text: t })}
                  />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        <AddRow onAdd={handleAdd} />
      </motion.div>

      {/* Past entries history */}
      {pastDates.length > 0 && (
        <motion.div {...fadeUp(0.18)} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-1">
            Past days
          </p>
          <AnimatePresence>
            {pastDates.map((date, index) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
              >
                <PastDaySection
                  date={date}
                  entries={pastGroups[date]}
                  todayStr={todayStr}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {pastDates.length === 0 && entries !== undefined && entries.length === 0 && (
        <motion.div {...fadeUp(0.18)} className="text-center py-12 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-rose-400/10 flex items-center justify-center mx-auto">
            <Heart className="w-7 h-7 text-rose-400" />
          </div>
          <p className="font-semibold">Start tracking your giving</p>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Each day, record the moments where you created value — for others, your work, or yourself.
          </p>
        </motion.div>
      )}
    </div>
  );
}
