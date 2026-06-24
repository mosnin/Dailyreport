"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { currentPeriodKey, periodLabel, type GoalCategory } from "@/lib/utils";
import { BentoCard } from "@/components/bento/BentoCard";
import { ScoreRing } from "@/components/bento/ScoreRing";
import { PageHeader } from "@/components/bento/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Check, Plus, Pencil, Trash2 } from "lucide-react";

const GOALS = "var(--goals)";

const CATEGORY_META: Record<GoalCategory, { label: string }> = {
  yearly: { label: "Long-term" },
  quarterly: { label: "Mid-term" },
  monthly: { label: "Monthly" },
  weekly: { label: "Weekly" },
};

/* ---------------------------------------------------------------- */
/* Overview ring                                                     */
/* ---------------------------------------------------------------- */

function OverviewRing({
  category,
  data,
}: {
  category: GoalCategory;
  data: { total: number; completed: number; periodKey: string } | undefined;
}) {
  const total = data?.total ?? 0;
  const completed = data?.completed ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const pk = data?.periodKey ?? currentPeriodKey(category);

  return (
    <BentoCard className="flex flex-col items-center justify-center gap-3 text-center">
      <ScoreRing value={pct} color={GOALS} size={72} stroke={7}>
        <span className="numeral text-sm font-bold leading-none">
          {completed}
          <span className="text-muted-foreground/60">/{total}</span>
        </span>
      </ScoreRing>
      <div className="min-w-0">
        <p className="text-sm font-semibold capitalize">{CATEGORY_META[category].label}</p>
        <p className="text-[11px] text-muted-foreground/70 truncate">
          {periodLabel(category, pk)}
        </p>
      </div>
    </BentoCard>
  );
}

/* ---------------------------------------------------------------- */
/* Goal row                                                          */
/* ---------------------------------------------------------------- */

function GoalRow({ goal }: { goal: any }) {
  const toggle = useMutation(api.goals.toggle);
  const remove = useMutation(api.goals.remove);
  const updateTitle = useMutation(api.goals.updateTitle);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(goal.title);

  async function saveEdit() {
    const title = draft.trim();
    setEditing(false);
    if (!title || title === goal.title) {
      setDraft(goal.title);
      return;
    }
    await updateTitle({ goalId: goal._id as Id<"goals">, title });
    toast.success("Goal updated");
  }

  return (
    <div className="group flex items-center gap-2.5 py-1.5">
      <button
        type="button"
        onClick={() => toggle({ goalId: goal._id as Id<"goals"> })}
        aria-label={goal.completed ? "Mark incomplete" : "Mark complete"}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          goal.completed
            ? "border-transparent text-[oklch(0.2_0.03_264)]"
            : "border-border text-transparent hover:border-[var(--goals)]"
        )}
        style={goal.completed ? { background: GOALS } : undefined}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </button>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") {
              setDraft(goal.title);
              setEditing(false);
            }
          }}
          className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      ) : (
        <span
          className={cn(
            "flex-1 text-sm leading-snug",
            goal.completed && "line-through text-muted-foreground/60"
          )}
        >
          {goal.title}
        </span>
      )}

      {!editing && (
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => {
              setDraft(goal.title);
              setEditing(true);
            }}
            aria-label="Edit goal"
            className="rounded-md p-1 text-muted-foreground/70 hover:text-foreground hover:bg-muted/60"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={async () => {
              await remove({ goalId: goal._id as Id<"goals"> });
              toast.success("Goal removed");
            }}
            aria-label="Delete goal"
            className="rounded-md p-1 text-muted-foreground/70 hover:text-red-500 hover:bg-muted/60"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Goal list (per category)                                          */
/* ---------------------------------------------------------------- */

function GoalList({ category, label }: { category: GoalCategory; label: string }) {
  const { convexUserId } = useConvexUser();
  const periodKey = currentPeriodKey(category);

  const goals = useQuery(
    api.goals.list,
    convexUserId ? { userId: convexUserId, category, periodKey } : "skip"
  );
  const add = useMutation(api.goals.add);

  const [input, setInput] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = input.trim();
    if (!title || !convexUserId) return;
    setInput("");
    await add({ userId: convexUserId, category, periodKey, title });
    toast.success("Goal added");
  }

  const list: any[] = goals ?? [];
  const completed = list.filter((g) => g.completed).length;
  const total = list.length;

  return (
    <BentoCard className="flex h-full flex-col">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
            {label}
          </p>
          <p className="text-xs text-muted-foreground/70 truncate">
            {periodLabel(category, periodKey)}
          </p>
        </div>
        <span className="numeral shrink-0 text-sm font-semibold text-muted-foreground">
          {completed}/{total}
        </span>
      </div>

      <div className="flex-1 -my-1">
        {goals === undefined ? (
          <div className="space-y-2 py-1">
            <Skeleton className="h-5 w-full rounded-lg" />
            <Skeleton className="h-5 w-4/5 rounded-lg" />
          </div>
        ) : total === 0 ? (
          <p className="py-3 text-sm text-muted-foreground/50">
            No goals yet - add one below.
          </p>
        ) : (
          <div className="divide-y divide-border/40">
            {list.map((g) => (
              <GoalRow key={g._id} goal={g} />
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleAdd} className="mt-3 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Add a ${label.toLowerCase()} goal…`}
          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim()}
          className="shrink-0"
          style={{ background: GOALS, color: "oklch(0.2 0.03 264)" }}
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
        </Button>
      </form>
    </BentoCard>
  );
}

/* ---------------------------------------------------------------- */
/* Page                                                              */
/* ---------------------------------------------------------------- */

export default function GoalsPage() {
  const { convexUserId } = useConvexUser();

  const summary = useQuery(
    api.goals.getCurrentSummary,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  if (!convexUserId || summary === undefined) {
    return (
      <div className="space-y-4 pb-6">
        <Skeleton className="h-20 w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-3xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-3xl" />
      </div>
    );
  }

  const categories: GoalCategory[] = ["yearly", "quarterly", "monthly", "weekly"];

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        eyebrow="Life domain"
        title="Goals"
        subtitle="Your ambitions across every horizon - short, mid and long-term."
        action={
          <Link
            href="/projects"
            className="rounded-full px-4 py-2 text-sm font-semibold text-[oklch(0.2_0.03_264)]"
            style={{ background: GOALS }}
          >
            Projects →
          </Link>
        }
      />

      {/* Overview rings */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {categories.map((cat) => (
          <OverviewRing key={cat} category={cat} data={summary?.[cat]} />
        ))}
      </div>

      {/* Long-term + Mid-term */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GoalList category="yearly" label="This year" />
        <GoalList category="quarterly" label="This quarter" />
      </div>

      {/* Short-term */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
          Short-term
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GoalList category="monthly" label="This month" />
          <GoalList category="weekly" label="This week" />
        </div>
      </div>
    </div>
  );
}
