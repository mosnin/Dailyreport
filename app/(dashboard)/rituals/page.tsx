"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { format } from "date-fns";

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
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

  const [editing, setEditing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const completedIds = new Set(log?.completedIds ?? []);
  const completedCount = rituals.filter((r) => completedIds.has(r._id)).length;
  const totalCount = rituals.length;
  const allDone = totalCount > 0 && completedCount === totalCount;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

  async function handleToggle(ritualId: string) {
    if (!convexUserId || editing) return;
    await toggleRitual({ userId: convexUserId, date: today, ritualId });
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || !convexUserId) return;
    await addRitual({ userId: convexUserId, title });
    setNewTitle("");
  }

  async function handleUpdate(ritualId: string) {
    const title = editingTitle.trim();
    if (!title) return;
    await updateRitual({ ritualId: ritualId as any, title });
    setEditingId(null);
  }

  function exitEdit() {
    setEditing(false);
    setAdding(false);
    setNewTitle("");
    setEditingId(null);
  }

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-md space-y-5">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-56 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-6 pb-8">
      <motion.div {...fadeUp(0)}>
        <p className="text-xs text-muted-foreground font-medium tracking-wide mb-1 select-none">
          {format(new Date(), "EEEE, MMMM d")}
        </p>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">
          Rituals
        </h1>
      </motion.div>

      <motion.div {...fadeUp(1)}>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">

          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <AnimatePresence mode="wait">
              {allDone ? (
                <motion.span
                  key="done"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-sm font-medium text-emerald-500"
                >
                  All done for today.
                </motion.span>
              ) : (
                <motion.span
                  key="count"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-sm text-muted-foreground"
                >
                  {totalCount === 0
                    ? "No rituals yet"
                    : `${completedCount} of ${totalCount} today`}
                </motion.span>
              )}
            </AnimatePresence>

            <button
              onClick={editing ? exitEdit : () => setEditing(true)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {editing ? "Done" : "Edit"}
            </button>
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="h-0.5 bg-border">
              <motion.div
                className={cn("h-full", allDone ? "bg-emerald-500" : "bg-primary/50")}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          )}

          {/* Ritual rows */}
          {totalCount === 0 && !editing ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Tap <span className="font-semibold text-foreground">Edit</span> to add your first ritual.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              <AnimatePresence initial={false}>
                {rituals.map((ritual) => {
                  const done = completedIds.has(ritual._id);

                  if (editing) {
                    return (
                      <motion.div
                        key={ritual._id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-3 px-5 py-3.5 group"
                      >
                        {editingId === ritual._id ? (
                          <form
                            className="flex-1 flex items-center gap-2"
                            onSubmit={(e) => { e.preventDefault(); void handleUpdate(ritual._id); }}
                          >
                            <input
                              autoFocus
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="flex-1 text-sm bg-transparent focus:outline-none border-b border-primary pb-0.5"
                            />
                            <button type="submit" className="text-primary shrink-0">
                              <Check className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => setEditingId(null)} className="text-muted-foreground shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        ) : (
                          <>
                            <span className="flex-1 text-sm">{ritual.title}</span>
                            <button
                              onClick={() => { setEditingId(ritual._id); setEditingTitle(ritual.title); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-foreground p-1 shrink-0"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeRitual({ ritualId: ritual._id as any })}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-destructive p-1 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </motion.div>
                    );
                  }

                  return (
                    <motion.button
                      key={ritual._id}
                      layout
                      onClick={() => handleToggle(ritual._id)}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.12 }}
                      className={cn(
                        "w-full flex items-center gap-4 px-5 py-4 text-left transition-colors",
                        done ? "bg-emerald-500/[0.05]" : "hover:bg-muted/20"
                      )}
                    >
                      <motion.div
                        animate={{ scale: done ? [1, 1.18, 1] : 1 }}
                        transition={{ duration: 0.25 }}
                        className="shrink-0"
                      >
                        {done ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground/25" />
                        )}
                      </motion.div>
                      <span
                        className={cn(
                          "text-sm font-medium flex-1 min-w-0 transition-colors",
                          done ? "text-muted-foreground/60" : "text-foreground"
                        )}
                      >
                        {ritual.title}
                      </span>
                    </motion.button>
                  );
                })}
              </AnimatePresence>

              {/* Add row — only in edit mode */}
              {editing && (
                <div className="border-t border-border/60">
                  <AnimatePresence mode="wait">
                    {adding ? (
                      <motion.form
                        key="input"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onSubmit={handleAdd}
                        className="flex items-center gap-3 px-5 py-3.5"
                      >
                        <input
                          autoFocus
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="What will you do every day?"
                          className="flex-1 text-sm bg-transparent focus:outline-none placeholder:text-muted-foreground/35"
                        />
                        <button type="submit" disabled={!newTitle.trim()} className="text-primary disabled:opacity-30 shrink-0">
                          <Check className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => { setAdding(false); setNewTitle(""); }} className="text-muted-foreground shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.form>
                    ) : (
                      <motion.button
                        key="btn"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setAdding(true)}
                        className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Plus className="w-4 h-4 shrink-0" />
                        Add ritual
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
