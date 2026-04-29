"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { type GoalCategory, currentPeriodKey, periodLabel, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, CheckCircle2, Circle } from "lucide-react";

const CATEGORY_META: Record<GoalCategory, { label: string; description: string; color: string }> = {
  lifelong: {
    label: "Life Goals",
    description: "What you want to achieve across your lifetime",
    color: "text-purple-500",
  },
  yearly: {
    label: "Yearly Goals",
    description: "What you want to accomplish this year",
    color: "text-blue-500",
  },
  quarterly: {
    label: "Quarterly Goals",
    description: "Your focus for this quarter",
    color: "text-indigo-500",
  },
  monthly: {
    label: "Monthly Goals",
    description: "What you want to achieve this month",
    color: "text-teal-500",
  },
  weekly: {
    label: "Weekly Goals",
    description: "Your targets for this week",
    color: "text-green-500",
  },
};

export function GoalSection({
  userId,
  category,
}: {
  userId: Id<"users">;
  category: GoalCategory;
}) {
  const periodKey = currentPeriodKey(category);
  const meta = CATEGORY_META[category];
  const label = periodLabel(category, periodKey);

  const goals = useQuery(api.goals.list, { userId, category, periodKey });
  const addGoal = useMutation(api.goals.add);
  const toggleGoal = useMutation(api.goals.toggle);
  const removeGoal = useMutation(api.goals.remove);
  const updateTitle = useMutation(api.goals.updateTitle);

  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

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
          <div className="text-right shrink-0">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            {total > 0 && (
              <div className="flex items-center justify-end gap-1.5 mt-1">
                <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all"
                    style={{ width: `${Math.round((completed / total) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {completed}/{total}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-1.5">
        {goals === undefined ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : goals.length === 0 && !adding ? (
          <p className="text-sm text-muted-foreground py-2">
            No goals yet.{" "}
            <button
              onClick={() => setAdding(true)}
              className="text-primary underline-offset-2 hover:underline"
            >
              Add your first one.
            </button>
          </p>
        ) : (
          <>
            {goals.map((goal) => (
              <GoalRow
                key={goal._id}
                title={goal.title}
                completed={goal.completed}
                onToggle={() => toggleGoal({ goalId: goal._id })}
                onRemove={() => removeGoal({ goalId: goal._id })}
                onUpdateTitle={(t) => updateTitle({ goalId: goal._id, title: t })}
              />
            ))}
          </>
        )}

        {/* Add row */}
        {adding ? (
          <form onSubmit={handleAdd} className="flex items-center gap-2 pt-1">
            <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
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
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-1 w-full"
          >
            <Plus className="w-3.5 h-3.5" />
            Add goal
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Individual goal row ──────────────────────────────────────────────────────

function GoalRow({
  title,
  completed,
  onToggle,
  onRemove,
  onUpdateTitle,
}: {
  title: string;
  completed: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onUpdateTitle: (t: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
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

  return (
    <div className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-muted/50 transition-colors">
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 text-muted-foreground hover:text-green-500 transition-colors"
      >
        {completed ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <Circle className="w-4 h-4" />
        )}
      </button>

      {editing ? (
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
          onDoubleClick={() => setEditing(true)}
          className={cn(
            "flex-1 text-sm cursor-default select-none",
            completed && "line-through text-muted-foreground"
          )}
        >
          {title}
        </span>
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
