"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useConvexUser } from "@/hooks/useConvexUser";
import { todayString, cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { PageHeader } from "@/components/bento/PageHeader";
import { BentoCard } from "@/components/bento/BentoCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const ACCENT = "var(--progress)";
const SECTION_LABEL =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60";
const INPUT =
  "w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

const STATUS_LABEL: Record<string, string> = {
  planning: "Planning",
  active: "Active",
  blocked: "Blocked",
  done: "Done",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${v}%`, background: ACCENT }}
      />
    </div>
  );
}

/** Per-project update control. Keeps its own local state. */
function ProjectUpdateCard({
  project,
  userId,
  delay,
}: {
  project: any;
  userId: Id<"users">;
  delay: number;
}) {
  const addUpdate = useMutation(api.projects.addUpdate);
  const [progress, setProgress] = useState<number>(project.progress ?? 0);
  const [hrs, setHrs] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function handleLog() {
    setSaving(true);
    try {
      await addUpdate({
        userId,
        projectId: project._id,
        date: todayString(),
        progress: Number(progress),
        hoursSpent: hrs ? Number(hrs) : undefined,
        note: note || undefined,
      });
      toast.success("Progress logged");
      setHrs("");
      setNote("");
    } catch {
      toast.error("Could not log progress");
    } finally {
      setSaving(false);
    }
  }

  return (
    <BentoCard className="col-span-2" delay={delay}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{project.title}</h3>
          {project.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <ProgressBar value={project.progress ?? 0} />
        <span className="text-xs font-semibold numeral shrink-0" style={{ color: ACCENT }}>
          {Math.round(project.progress ?? 0)}%
        </span>
      </div>

      {project.linkedGoalId && (
        <p className="mt-2 text-[11px] text-muted-foreground/80">Linked to a goal</p>
      )}

      <div className="mt-4 space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs text-muted-foreground">
            New progress: <span className="numeral font-semibold" style={{ color: ACCENT }}>{progress}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full accent-[var(--progress)]"
          />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">Hours spent (optional)</span>
            <input
              type="number"
              min={0}
              step={0.5}
              value={hrs}
              onChange={(e) => setHrs(e.target.value)}
              placeholder="2"
              className={INPUT}
            />
          </label>
          <div className="flex items-end">
            <Button
              onClick={handleLog}
              disabled={saving}
              className="w-full rounded-xl text-[oklch(0.2_0.03_264)] font-semibold"
              style={{ background: ACCENT }}
            >
              {saving ? "Logging…" : "Log progress"}
            </Button>
          </div>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs text-muted-foreground">Note (optional)</span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What moved forward today?"
            className={cn(INPUT, "resize-none")}
          />
        </label>
      </div>
    </BentoCard>
  );
}

export default function ProjectProgressReportPage() {
  const { convexUserId } = useConvexUser();

  const projects = useQuery(
    api.projects.list,
    convexUserId ? { userId: convexUserId } : "skip"
  );
  const updates = useQuery(
    api.projects.recentUpdates,
    convexUserId ? { userId: convexUserId, days: 14 } : "skip"
  );

  if (!convexUserId || projects === undefined) {
    return (
      <div className="space-y-4 pb-6">
        <PageHeader
          eyebrow="Daily report"
          title="Project progress"
          subtitle="Move your projects forward and tie the work to your goals."
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Skeleton className="col-span-2 h-64 rounded-3xl" />
          <Skeleton className="col-span-2 h-64 rounded-3xl" />
          <Skeleton className="col-span-2 lg:col-span-4 h-48 rounded-3xl" />
        </div>
      </div>
    );
  }

  const activeProjects = (projects as any[]).filter(
    (p) => !p.archived && p.status !== "done"
  );

  const titleById = new Map<string, string>();
  for (const p of projects as any[]) titleById.set(p._id, p.title);

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        eyebrow="Daily report"
        title="Project progress"
        subtitle="Move your projects forward and tie the work to your goals."
      />

      {activeProjects.length === 0 ? (
        <BentoCard
          href="/projects"
          className="col-span-2 lg:col-span-4 flex flex-col items-center justify-center text-center py-12"
        >
          <p className={SECTION_LABEL}>No active projects</p>
          <p className="text-sm text-muted-foreground mt-2 mb-4">
            Start something worth tracking.
          </p>
          <span
            className="inline-flex rounded-full px-4 py-2 text-sm font-semibold text-[oklch(0.2_0.03_264)]"
            style={{ background: ACCENT }}
          >
            Create your first project
          </span>
        </BentoCard>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {activeProjects.map((p, i) => (
            <ProjectUpdateCard
              key={p._id}
              project={p}
              userId={convexUserId}
              delay={0.02 + i * 0.02}
            />
          ))}
        </div>
      )}

      {/* Recent updates */}
      <BentoCard className="col-span-2 lg:col-span-4" delay={0.05}>
        <p className={SECTION_LABEL}>Recent updates</p>
        <h2 className="font-semibold mt-1 mb-4">Your latest progress reports</h2>
        {updates === undefined ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : (updates as any[]).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No updates yet — log progress on a project above.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {(updates as any[]).map((u) => (
              <li key={u._id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {titleById.get(u.projectId) ?? "Project"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {u.date}
                    {u.hoursSpent != null ? ` · ${u.hoursSpent}h` : ""}
                    {u.note ? ` · ${u.note}` : ""}
                  </p>
                </div>
                <span
                  className="text-sm font-bold numeral shrink-0"
                  style={{ color: ACCENT }}
                >
                  {Math.round(u.progress)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </BentoCard>
    </div>
  );
}
