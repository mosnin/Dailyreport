"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  type GoalCategory,
  currentPeriodKey,
  previousPeriodKey,
  nextPeriodKey,
  periodLabel,
  cn,
} from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, CheckCircle2, Circle, ChevronLeft, ChevronRight, Target } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { itemExitVariants } from "@/lib/motion";

const CATEGORY_META: Record<GoalCategory, { label: string; description: string; color: string }> = {
  yearly: {
    label: "Yearly Goals",
    description: "What you want to accomplish this year",
    color: "text-chart-1",
  },
  quarterly: {
    label: "Quarterly Goals",
    description: "Your focus for this quarter",
    color: "text-chart-2",
  },
  monthly: {
    label: "Monthly Goals",
    description: "What you want to achieve this month",
    color: "text-chart-3",
  },
  weekly: {
    label: "Weekly Goals",
    description: "Your targets for this week",
    color: "text-chart-4",
  },
};

export function GoalSection({
  userId,
  category,
}: {
  userId: Id<"users">;
  category: GoalCategory;
}) {
  const currentKey = currentPeriodKey(category);
  const [periodKey, setPeriodKey] = useState(currentKey);
  const meta = CATEGORY_META[category];
  const label = periodLabel(category, periodKey);
  const isCurrentPeriod = periodKey === currentKey;

  const prevKey = previousPeriodKey(category, periodKey);
  const nextKey = nextPeriodKey(category, periodKey);

  const goals = useQuery(api.goals.list, { userId, category, periodKey });
  const addGoal = useMutation(api.goals.add);
  const toggleGoal = useMutation(api.goals.toggle).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.goals.list, { userId, category, periodKey });
      if (current === undefined) return;
      localStore.setQuery(
        api.goals.list,
        { userId, category, periodKey },
        current.map((g) => g._id === args.goalId ? { ...g, completed: !g.completed } : g)
      );
    }
  );
  const removeGoal = useMutation(api.goals.remove).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.goals.list, { userId, category, periodKey });
      if (current === undefined) return;
      localStore.setQuery(
        api.goals.list,
        { userId, category, periodKey },
        current.filter((g) => g._id !== args.goalId)
      );
    }
  );
  const updateTitle = useMutation(api.goals.updateTitle);

  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  useEffect(() => {
    setAdding(false);
    setNewTitle("");
  }, [periodKey]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    await addGoal({ userId, category, periodKey, title });
    setNewTitle("");
    inputRef.current?.focus();
  }

  const completed = goals?.filter((g) => g.completed).length ?? 0;
  const total = goals?.length ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span className={meta.color}>●</span>
              {meta.label}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
          </div>

          {/* Period navigator */}
          <div className="shrink-0 flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              {prevKey && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPeriodKey(prevKey)}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  title="Previous period"
                >
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>
              )}
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {label}
              </span>
              {nextKey && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setPeriodKey(nextKey)}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  title="Next period"
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {!isCurrentPeriod && (
                <button
                  onClick={() => setPeriodKey(currentKey)}
                  className="text-[10px] text-primary hover:underline"
                >
                  Back to current
                </button>
              )}
              {isCurrentPeriod && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                  Current
                </Badge>
              )}
              {total > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-green-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round((completed / total) * 100)}%` }}
                      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {completed}/{total}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-1">
        {goals === undefined ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : goals.length === 0 && !adding ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="py-8 flex flex-col items-center text-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center">
              <Target className="w-5 h-5 text-muted-foreground/50" />
            </div>
            <div className="space-y-1 max-w-[200px]">
              <p className="text-sm font-semibold text-foreground">No goals for this period</p>
              <p className="text-xs text-muted-foreground leading-relaxed">Add a goal you&apos;re working toward. One specific, measurable target.</p>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {goals.map((goal) => (
              <motion.div
                key={goal._id}
                variants={itemExitVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                <GoalRow
                  title={goal.title}
                  completed={goal.completed}
                  readonly={!isCurrentPeriod}
                  onToggle={() => toggleGoal({ goalId: goal._id })}
                  onRemove={() => removeGoal({ goalId: goal._id })}
                  onUpdateTitle={(t) => updateTitle({ goalId: goal._id, title: t })}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {isCurrentPeriod && (
          adding ? (
            <form onSubmit={handleAdd} className="flex items-center gap-2 pt-1">
              <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onBlur={() => { if (!newTitle.trim()) setAdding(false); }}
                onKeyDown={(e) => { if (e.key === "Escape") { setAdding(false); setNewTitle(""); } }}
                placeholder="Type a goal and press Enter…"
                className="flex-1 text-sm bg-transparent border-b border-primary focus:outline-none pb-1"
              />
              <Button type="submit" size="sm" disabled={!newTitle.trim()}>
                Add
              </Button>
              <button
                type="button"
                onClick={() => { setAdding(false); setNewTitle(""); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </form>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setAdding(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-1 w-full"
            >
              <Plus className="w-4 h-4" />
              Add goal
            </motion.button>
          )
        )}
      </CardContent>
    </Card>
  );
}

// ── Individual goal row ──────────────────────────────────────────────────────

function GoalRow({
  title,
  completed,
  readonly,
  onToggle,
  onRemove,
  onUpdateTitle,
}: {
  title: string;
  completed: boolean;
  readonly?: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdateTitle: (t: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commitEdit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== title) onUpdateTitle(trimmed);
    else setDraft(title);
    setEditing(false);
  }

  function handleToggle() {
    if (!completed) {
      setFlash(true);
      setTimeout(() => setFlash(false), 700);
    }
    onToggle();
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors duration-500",
        flash ? "bg-emerald-50 dark:bg-emerald-950/30" : "hover:bg-muted/50"
      )}
    >
      <motion.button
        type="button"
        onClick={readonly ? undefined : handleToggle}
        disabled={readonly}
        whileTap={readonly ? {} : { scale: 0.85 }}
        className={cn(
          "shrink-0 transition-colors",
          readonly
            ? "text-muted-foreground/50 cursor-default"
            : "text-muted-foreground hover:text-green-500"
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {completed ? (
            <motion.span key="done" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.2 }}>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </motion.span>
          ) : (
            <motion.span key="empty" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.2 }}>
              <Circle className="w-5 h-5" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {editing && !readonly ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitEdit();
            if (e.key === "Escape") { setDraft(title); setEditing(false); }
          }}
          className="flex-1 text-sm bg-transparent border-b border-primary focus:outline-none pb-0.5"
        />
      ) : (
        <span
          onDoubleClick={() => !readonly && setEditing(true)}
          className={cn(
            "flex-1 text-sm cursor-default select-none",
            completed && "line-through text-muted-foreground"
          )}
        >
          {title}
        </span>
      )}

      {!readonly && (
        <motion.button
          type="button"
          onClick={onRemove}
          whileTap={{ scale: 0.85 }}
          className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
}
