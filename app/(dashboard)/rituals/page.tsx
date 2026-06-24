"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { PageHeader } from "@/components/bento/PageHeader";
import { BentoCard } from "@/components/bento/BentoCard";
// @ts-ignore
import Counter from "@/components/Counter";
// @ts-ignore
import AnimatedList from "@/components/AnimatedList";

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
        <Skeleton className="h-56 w-full rounded-[1.75rem]" />
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-4 pb-8">
      <PageHeader
        eyebrow={`Practice · ${format(new Date(), "EEEE, MMMM d")}`}
        title="Rituals"
      />

      <motion.div {...fadeUp(1)}>
        <BentoCard className="overflow-hidden !p-0">

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
                    : (
                      <span className="inline-flex items-center gap-1">
                        <Counter value={completedCount} places={[10, 1]} fontSize={14} padding={1} gap={0} horizontalPadding={0} textColor="currentColor" fontWeight="inherit" digitPlaceHolders={false} gradientHeight={0} />
                        <span>of {totalCount} today</span>
                      </span>
                    )}
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
                className={cn("h-full", allDone && "bg-emerald-500")}
                style={allDone ? undefined : { background: "var(--execution)" }}
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
            <div>
              {editing ? (
                <div className="divide-y divide-border/60">
                  <AnimatePresence initial={false}>
                    {rituals.map((ritual) => (
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
                            <button type="submit" className="text-xs font-medium text-primary shrink-0">
                              Save
                            </button>
                            <button type="button" onClick={() => setEditingId(null)} className="text-xs text-muted-foreground shrink-0">
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <>
                            <span className="flex-1 text-sm">{ritual.title}</span>
                            <button
                              onClick={() => { setEditingId(ritual._id); setEditingTitle(ritual.title); }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground/50 hover:text-foreground p-1 shrink-0"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removeRitual({ ritualId: ritual._id as any })}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground/50 hover:text-destructive p-1 shrink-0"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <AnimatedList
                  items={rituals as any[]}
                  showGradients={false}
                  enableArrowNavigation={false}
                  displayScrollbar={false}
                  renderItem={(ritual: any) => {
                    const done = completedIds.has(ritual._id);
                    return (
                      <motion.button
                        onClick={() => handleToggle(ritual._id)}
                        whileTap={{ scale: 0.98 }}
                        transition={{ duration: 0.12 }}
                        className={cn(
                          "w-full flex items-center gap-4 px-5 py-4 text-left transition-colors border-b border-border/60 last:border-0",
                          done ? "bg-emerald-500/[0.05]" : "hover:bg-muted/20"
                        )}
                      >
                        <motion.div
                          animate={{ scale: done ? [1, 1.18, 1] : 1 }}
                          transition={{ duration: 0.25 }}
                          className="shrink-0 text-xs font-medium w-10"
                        >
                          {done ? (
                            <span className="text-emerald-500">Done</span>
                          ) : (
                            <span className="text-muted-foreground/40">Mark</span>
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
                  }}
                />
              )}

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
                        <button type="submit" disabled={!newTitle.trim()} className="text-xs font-medium text-primary disabled:opacity-30 shrink-0">
                          Save
                        </button>
                        <button type="button" onClick={() => { setAdding(false); setNewTitle(""); }} className="text-xs text-muted-foreground shrink-0">
                          Cancel
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
                        Add ritual
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </BentoCard>
      </motion.div>
    </div>
  );
}
