"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { fadeUp } from "@/lib/motion";
import { Bot, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

const PLATFORMS = [
  { id: "slack",   name: "Slack",   color: "bg-[#4A154B]" },
  { id: "notion",  name: "Notion",  color: "bg-gray-800" },
  { id: "asana",   name: "Asana",   color: "bg-[#FC636B]" },
  { id: "clickup", name: "ClickUp", color: "bg-[#7B68EE]" },
  { id: "trello",  name: "Trello",  color: "bg-[#0052CC]" },
] as const;

function getPlatform(id: string) {
  return PLATFORMS.find((p) => p.id === id) ?? { id, name: id, color: "bg-muted" };
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    queued:  "bg-muted text-muted-foreground",
    running: "bg-blue-500/10 text-blue-500 animate-pulse",
    done:    "bg-emerald-500/10 text-emerald-600",
    failed:  "bg-destructive/10 text-destructive",
  };
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", variants[status] ?? variants.queued)}>
      {status}
    </span>
  );
}

export default function AgentPage() {
  const { convexUserId, convexUser, isLoading } = useConvexUser();

  const [intent, setIntent] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [jobsExpanded, setJobsExpanded] = useState(false);

  // @ts-ignore
  const createJob = useMutation(api.agentJobs.createJob);
  // @ts-ignore
  const markTaskComplete = useMutation(api.externalTasks.markTaskComplete);

  // @ts-ignore
  const integrations = useQuery(
    // @ts-ignore
    api.integrations.getUserIntegrations,
    convexUserId ? { userId: convexUserId } : "skip"
  ) ?? [];
  const connectedPlatforms = (integrations as any[]).map((i: any) => i.platform);

  // @ts-ignore — agentJobs not yet in generated types; run npx convex dev --once
  const activeJob = useQuery(
    // @ts-ignore
    api.agentJobs.getJob,
    // @ts-ignore
    activeJobId ? { jobId: activeJobId } : "skip"
  );

  // @ts-ignore
  const recentJobs = useQuery(
    // @ts-ignore
    api.agentJobs.listRecentJobs,
    convexUserId ? { userId: convexUserId } : "skip"
  ) ?? [];

  // @ts-ignore
  const externalTasks = useQuery(
    // @ts-ignore
    api.externalTasks.getTasksByUser,
    convexUserId ? { userId: convexUserId } : "skip"
  ) ?? [];

  // Clear activeJobId 3 seconds after job finishes
  useEffect(() => {
    if (!activeJob) return;
    if (activeJob.status === "done" || activeJob.status === "failed") {
      const t = setTimeout(() => setActiveJobId(null), 3000);
      return () => clearTimeout(t);
    }
  }, [activeJob?.status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!intent.trim() || !convexUserId) return;
    setSubmitting(true);
    try {
      // @ts-ignore
      const jobId = await createJob({ userId: convexUserId, intent: intent.trim() });
      setActiveJobId(jobId);
      const savedIntent = intent.trim();
      setIntent("");
      await fetch("/api/agent/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          intent: savedIntent,
          convexUserId,
          connectedPlatforms,
          userName: (convexUser as any)?.name ?? "",
          userTimezone: (convexUser as any)?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Find the latest completed job with a briefing
  const latestBriefingJob = (recentJobs as any[]).find(
    (j: any) => j.status === "done" && j.result?.briefing
  );

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 pb-8">
      {/* Header */}
      <motion.div {...fadeUp(0)}>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">Agent</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your chief of staff. Always working.</p>
      </motion.div>

      {/* Briefing card */}
      <motion.div {...fadeUp(1)}>
        {latestBriefingJob ? (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <p className="font-heading text-sm italic text-foreground/90 leading-relaxed">
              {latestBriefingJob.result.briefing}
            </p>
            {Array.isArray(latestBriefingJob.result.priorities) && latestBriefingJob.result.priorities.length > 0 && (
              <ol className="space-y-1 mt-2">
                {(latestBriefingJob.result.priorities as string[]).slice(0, 3).map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground/70 shrink-0 w-4">{i + 1}.</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground italic">
              Run a briefing to see your day at a glance. Ask me what&apos;s overdue, what to prioritize, or what your week looks like.
            </p>
          </div>
        )}
      </motion.div>

      {/* Active job status */}
      {activeJobId && activeJob && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-border bg-card p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Running</span>
            <StatusBadge status={activeJob.status} />
          </div>
          {activeJob.intent && (
            <p className="text-xs text-muted-foreground truncate">{activeJob.intent}</p>
          )}
          {Array.isArray(activeJob.progressLog) && activeJob.progressLog.length > 0 && (
            <div className="space-y-0.5 max-h-40 overflow-y-auto">
              {(activeJob.progressLog as { ts: number; text: string }[]).map((entry, i) => (
                <div key={i} className="flex items-start gap-2 font-mono text-[11px] text-muted-foreground">
                  <span className="shrink-0 opacity-50">
                    {new Date(entry.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <span>{entry.text}</span>
                </div>
              ))}
            </div>
          )}
          {activeJob.status === "done" && activeJob.result && (
            <p className="text-xs text-emerald-600 font-medium">Done. Clearing in a moment…</p>
          )}
          {activeJob.status === "failed" && (
            <p className="text-xs text-destructive font-medium">{activeJob.error ?? "Something went wrong."}</p>
          )}
        </motion.div>
      )}

      {/* Task feed */}
      <motion.div {...fadeUp(2)} className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-[0.12em]">Tasks</h2>
        {(externalTasks as any[]).length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              No tasks synced yet. Connect a platform to get started — your agent will pull tasks automatically.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {(externalTasks as any[]).map((task: any) => {
              const platform = getPlatform(task.platform);
              return (
                <div
                  key={task._id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-colors",
                    task.completed ? "opacity-50" : "hover:bg-muted/30"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-md text-white text-[9px] font-bold flex items-center justify-center shrink-0",
                      platform.color
                    )}
                  >
                    {platform.id[0].toUpperCase()}
                  </div>
                  <span className={cn("text-sm flex-1 min-w-0 truncate", task.completed && "line-through")}>
                    {task.title}
                  </span>
                  {task.dueDate && (
                    <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">{task.dueDate}</span>
                  )}
                  {task.url && (
                    <a
                      href={task.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      title="Open"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {!task.completed && (
                    <button
                      onClick={() =>
                        // @ts-ignore
                        markTaskComplete({ userId: convexUserId, taskId: task._id })
                      }
                      className="shrink-0 text-xs font-medium text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10 rounded-md px-2 py-1 transition-colors"
                    >
                      Done
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Command bar */}
      <motion.div {...fadeUp(3)}>
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <Bot className="w-4 h-4 text-muted-foreground/50 mt-0.5 shrink-0" />
            <textarea
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Brief me for today. What's overdue? Mark the landing page done…"
              rows={2}
              disabled={submitting}
              className="flex-1 text-sm bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/40 leading-relaxed disabled:opacity-50"
            />
          </div>
          <div className="flex justify-end mt-3">
            <button
              type="submit"
              disabled={!intent.trim() || submitting || !convexUserId}
              className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold px-4 py-1.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <Bot className="w-3.5 h-3.5" />
              {submitting ? "Running…" : "Run"}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Recent jobs */}
      <motion.div {...fadeUp(4)} className="space-y-2">
        <button
          onClick={() => setJobsExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="font-semibold uppercase tracking-[0.12em]">Recent jobs</span>
          {jobsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {jobsExpanded && (
          <div className="flex flex-col gap-1.5">
            {(recentJobs as any[]).length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent jobs. Submit a command above to get started.</p>
            ) : (
              (recentJobs as any[]).map((job: any) => (
                <div
                  key={job._id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2"
                >
                  <span className="text-xs text-foreground/80 flex-1 truncate">{job.intent}</span>
                  <StatusBadge status={job.status} />
                </div>
              ))
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
