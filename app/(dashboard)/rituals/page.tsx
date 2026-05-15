"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Plus, Trash2, GripVertical, Pencil, X, Check } from "lucide-react";
import { format } from "date-fns";

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function todayLabel(): string {
  return format(new Date(), "EEEE, MMMM d");
}

export default function RitualsPage() {
  const { convexUserId, isLoading } = useConvexUser();
  const today = todayIso();

  const rituals = useQuery(
    api.rituals.list,
    convexUserId ? { userId: convexUserId } : "skip"
  ) ?? [];

  const log = useQuery(
    api.rituals.getLog,
    convexUserId ? { userId: convexUserId, date: today } : "skip"
  );

  const toggleRitual = useMutation(api.rituals.toggle);
  const addRitual = useMutation(api.rituals.add);
  const removeRitual = useMutation(api.rituals.remove);
  const updateRitual = useMutation(api.rituals.update);

  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const completedIds = new Set(log?.completedIds ?? []);
  const completedCount = rituals.filter((r) => completedIds.has(r._id)).length;
  const totalCount = rituals.length;

  async function handleToggle(ritualId: string) {
    if (!convexUserId) return;
    await toggleRitual({ userId: convexUserId, date: today, ritualId });
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || !convexUserId) return;
    await addRitual({ userId: convexUserId, title });
    setNewTitle("");
    setAdding(false);
  }

  async function handleUpdate(ritualId: string) {
    const title = editingTitle.trim();
    if (!title) return;
    await updateRitual({ ritualId: ritualId as any, title });
    setEditingId(null);
  }

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-lg space-y-5">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-8 pb-8">
      <motion.div {...fadeUp(0)}>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">
          Daily Rituals
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{todayLabel()}</p>
      </motion.div>

      {/* Today's check-in */}
      <motion.div {...fadeUp(1)} className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em]">
            Today
          </h2>
          {totalCount > 0 && (
            <span className="text-[11px] text-muted-foreground/50">
              {completedCount} of {totalCount}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="h-1.5 rounded-full bg-border overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${(completedCount / totalCount) * 100}%` }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        )}

        {totalCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No rituals yet. Add your first one below.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            <AnimatePresence initial={false}>
              {rituals.map((ritual) => {
                const done = completedIds.has(ritual._id);
                return (
                  <motion.button
                    key={ritual._id}
                    layout
                    onClick={() => handleToggle(ritual._id)}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/30",
                      done && "bg-emerald-500/[0.04]"
                    )}
                  >
                    <div className="shrink-0">
                      {done ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground/30" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-sm font-medium flex-1 min-w-0",
                        done && "line-through text-muted-foreground"
                      )}
                    >
                      {ritual.title}
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Manage rituals */}
      <motion.div {...fadeUp(2)} className="space-y-3">
        <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em]">
          Your Rituals
        </h2>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {rituals.length > 0 && (
            <div className="divide-y divide-border">
              {rituals.map((ritual) => (
                <div key={ritual._id} className="flex items-center gap-3 px-4 py-3 group">
                  <GripVertical className="w-4 h-4 text-muted-foreground/20 shrink-0" />
                  {editingId === ritual._id ? (
                    <form
                      className="flex-1 flex items-center gap-2"
                      onSubmit={(e) => { e.preventDefault(); void handleUpdate(ritual._id); }}
                    >
                      <input
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        className="flex-1 text-sm bg-transparent focus:outline-none border-b border-primary"
                      />
                      <button type="submit" className="text-primary">
                        <Check className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="text-muted-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{ritual.title}</span>
                      <button
                        onClick={() => { setEditingId(ritual._id); setEditingTitle(ritual.title); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-foreground p-1"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removeRitual({ ritualId: ritual._id as any })}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-destructive p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add ritual */}
          <AnimatePresence>
            {adding ? (
              <motion.form
                key="add-form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAdd}
                className={cn("flex items-center gap-3 px-4 py-3", rituals.length > 0 && "border-t border-border")}
              >
                <input
                  ref={inputRef}
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ritual name…"
                  className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground/40"
                />
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="text-primary disabled:opacity-30"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setAdding(false); setNewTitle(""); }}
                  className="text-muted-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.form>
            ) : (
              <button
                key="add-btn"
                onClick={() => setAdding(true)}
                className={cn(
                  "w-full flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors",
                  rituals.length > 0 && "border-t border-border"
                )}
              >
                <Plus className="w-4 h-4" />
                Add ritual
              </button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
