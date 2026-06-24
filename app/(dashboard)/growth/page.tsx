"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { cn, formatDateLabel } from "@/lib/utils";
import { toast } from "sonner";
import { Trash2, Check, Plus, Sparkles, ShieldAlert } from "lucide-react";

import { BentoCard } from "@/components/bento/BentoCard";
import { PageHeader } from "@/components/bento/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const SKILL_ACCENT = "var(--progress)";
const FEAR_ACCENT = "var(--emotional)";

type GrowthType = "skill" | "fear";

function clamp(n: number) {
  return Math.max(0, Math.min(100, n));
}

const inputCls =
  "w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const eyebrowCls =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60";

function GrowthItem({
  item,
  accent,
  onUpdate,
  onRemove,
}: {
  item: any;
  accent: string;
  onUpdate: (patch: Record<string, any>) => void;
  onRemove: () => void;
}) {
  const achieved = item.status === "achieved";
  const progress = clamp(item.progress ?? 0);

  return (
    <BentoCard className={cn(achieved && "opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("text-sm font-semibold leading-tight", achieved && "line-through")}>
            {item.title}
          </p>
          {item.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{item.description}</p>
          )}
          {item.targetDate && (
            <p className="text-[11px] text-muted-foreground/70 mt-1.5 numeral">
              Target · {formatDateLabel(item.targetDate)}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label="Delete"
          className="-mt-1 -mr-1"
        >
          <Trash2 className="text-muted-foreground" />
        </Button>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
            Progress
          </span>
          <span className="text-xs font-bold numeral" style={{ color: accent }}>
            {progress}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-border/60 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: accent }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button
          variant="outline"
          size="xs"
          disabled={achieved || progress <= 0}
          onClick={() => onUpdate({ progress: clamp(progress - 10) })}
        >
          −10%
        </Button>
        <Button
          variant="outline"
          size="xs"
          disabled={achieved || progress >= 100}
          onClick={() => onUpdate({ progress: clamp(progress + 10) })}
        >
          +10%
        </Button>
        <Button
          variant={achieved ? "secondary" : "default"}
          size="xs"
          className="ml-auto"
          onClick={() =>
            onUpdate(
              achieved
                ? { status: "active" }
                : { status: "achieved", progress: 100 }
            )
          }
        >
          <Check />
          {achieved ? "Achieved" : "Mark achieved"}
        </Button>
      </div>
    </BentoCard>
  );
}

function Column({
  title,
  accent,
  icon,
  items,
  emptyHint,
  onUpdate,
  onRemove,
}: {
  title: string;
  accent: string;
  icon: React.ReactNode;
  items: any[];
  emptyHint: string;
  onUpdate: (id: Id<"growthItems">, patch: Record<string, any>) => void;
  onRemove: (id: Id<"growthItems">) => void;
}) {
  const active = items.filter((i) => i.status !== "achieved").length;
  const achieved = items.filter((i) => i.status === "achieved").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: accent }}>{icon}</span>
          <p className={eyebrowCls}>{title}</p>
        </div>
        <span className="text-xs text-muted-foreground numeral">
          {active} active · {achieved} done
        </span>
      </div>

      {items.length === 0 ? (
        <BentoCard>
          <p className="text-sm text-muted-foreground">{emptyHint}</p>
        </BentoCard>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <GrowthItem
              key={item._id}
              item={item}
              accent={accent}
              onUpdate={(patch) => onUpdate(item._id, patch)}
              onRemove={() => onRemove(item._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function GrowthPage() {
  const { convexUserId } = useConvexUser();

  const items = useQuery(
    api.growth.list,
    convexUserId ? { userId: convexUserId } : "skip"
  ) as any[] | undefined;

  const addItem = useMutation(api.growth.add);
  const updateItem = useMutation(api.growth.update);
  const removeItem = useMutation(api.growth.remove);

  const [type, setType] = useState<GrowthType>("skill");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loading = !convexUserId || items === undefined;

  const skills = (items ?? []).filter((i) => i.type === "skill");
  const fears = (items ?? []).filter((i) => i.type === "fear");

  async function handleAdd() {
    if (!convexUserId) return;
    if (!title.trim()) {
      toast.error(`Give your ${type} a title.`);
      return;
    }
    setSubmitting(true);
    try {
      await addItem({
        userId: convexUserId,
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        targetDate: targetDate.trim() || undefined,
      });
      setTitle("");
      setDescription("");
      setTargetDate("");
      toast.success(type === "skill" ? "Skill added." : "Fear added.");
    } catch {
      toast.error("Could not add item.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(id: Id<"growthItems">, patch: Record<string, any>) {
    try {
      await updateItem({ id, ...patch });
    } catch {
      toast.error("Could not update item.");
    }
  }

  async function handleRemove(id: Id<"growthItems">) {
    try {
      await removeItem({ id });
      toast.success("Removed.");
    } catch {
      toast.error("Could not remove item.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 pb-6">
        <PageHeader
          eyebrow="Life domain"
          title="Skills & Fears"
          subtitle="Level up new skills and overcome what holds you back."
        />
        <Skeleton className="h-44 rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    );
  }

  const activeAccent = type === "skill" ? SKILL_ACCENT : FEAR_ACCENT;

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        eyebrow="Life domain"
        title="Skills & Fears"
        subtitle="Level up new skills and overcome what holds you back."
      />

      {/* Add */}
      <BentoCard>
        <p className={cn(eyebrowCls, "mb-3")}>Add something to grow</p>

        <div className="flex gap-2 mb-3">
          {(["skill", "fear"] as GrowthType[]).map((t) => {
            const selected = type === t;
            const accent = t === "skill" ? SKILL_ACCENT : FEAR_ACCENT;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-colors",
                  selected
                    ? "text-background border-transparent"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
                style={selected ? { background: accent } : undefined}
              >
                {t === "skill" ? <Sparkles className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
                {t === "skill" ? "Skill" : "Fear"}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            className={inputCls}
            placeholder={type === "skill" ? "Skill to build…" : "Fear to overcome…"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
          />
          <div>
            <input
              type="date"
              className={inputCls}
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              aria-label="Target date"
            />
          </div>
        </div>

        <input
          className={cn(inputCls, "mt-3")}
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleAdd}
            disabled={submitting}
            style={{ background: activeAccent, color: "var(--background)" }}
          >
            <Plus />
            {submitting ? "Adding…" : `Add ${type}`}
          </Button>
        </div>
      </BentoCard>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <Column
          title="Skills to build"
          accent={SKILL_ACCENT}
          icon={<Sparkles className="size-4" />}
          items={skills}
          emptyHint="No skills yet — add one above and start leveling up."
          onUpdate={handleUpdate}
          onRemove={handleRemove}
        />
        <Column
          title="Fears to overcome"
          accent={FEAR_ACCENT}
          icon={<ShieldAlert className="size-4" />}
          items={fears}
          emptyHint="No fears tracked — naming one is the first step to beating it."
          onUpdate={handleUpdate}
          onRemove={handleRemove}
        />
      </div>
    </div>
  );
}
