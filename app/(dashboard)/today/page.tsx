"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useUser } from "@clerk/nextjs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp } from "@/lib/motion";
import {
  Bot,
  ExternalLink,
  Circle,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  Send,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────

function greet(firstName: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Good morning, ${firstName}.`;
  if (h < 17) return `Good afternoon, ${firstName}.`;
  return `Good evening, ${firstName}.`;
}

function todayLabel(): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return dueDate < todayIso();
}

const PLATFORM_DOT: Record<string, string> = {
  slack: "bg-[#4A154B]",
  notion: "bg-gray-600",
  asana: "bg-[#FC636B]",
  clickup: "bg-[#7B68EE]",
  trello: "bg-[#0052CC]",
  googlecalendar: "bg-[#1A73E8]",
};

// ── sub-components ────────────────────────────────────────────────────────

function TypingIndicator({ lastLine }: { lastLine?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </span>
      {lastLine && (
        <span className="text-xs text-muted-foreground truncate max-w-[240px]">{lastLine}</span>
      )}
    </div>
  );
}

function AgentBubble({ job }: { job: any }) {
  const lastProgress = job.progressLog?.length
    ? job.progressLog[job.progressLog.length - 1].text
    : undefined;

  return (
    <div className="flex gap-2.5 items-start">
      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="max-w-[82%] rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 space-y-1.5">
        {job.status === "queued" && (
          <p className="text-xs text-muted-foreground">Queued…</p>
        )}
        {job.status === "running" && <TypingIndicator lastLine={lastProgress} />}
        {job.status === "done" && job.result && (
          <>
            <p className="text-sm leading-relaxed text-foreground/90">
              {job.result.briefing ?? job.result.summary ?? (typeof job.result === "string" ? job.result : "Done.")}
            </p>
            {Array.isArray(job.result.priorities) && job.result.priorities.length > 0 && (
              <ol className="space-y-1 pt-2 border-t border-border mt-2">
                {(job.result.priorities as string[]).slice(0, 3).map((p: string, i: number) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground/50 shrink-0 w-3">{i + 1}.</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
            )}
            {Array.isArray(job.result.actions) && job.result.actions.length > 0 && (
              <ul className="space-y-1 pt-2 border-t border-border mt-2">
                {(job.result.actions as string[]).map((a: string, i: number) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-px" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {job.status === "failed" && (
          <p className="text-sm text-destructive">{job.error ?? "Something went wrong."}</p>
        )}
      </div>
    </div>
  );
}

// ── page ─────────────────────────────────────────────────────────────────

export default function TodayPage() {
  const { convexUserId, convexUser, isLoading } = useConvexUser();
  const { user } = useUser();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const threadBottomRef = useRef<HTMLDivElement>(null);

  const [intent, setIntent] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // @ts-ignore
  const createJob = useMutation(api.agentJobs.createJob);
  // @ts-ignore
  const markDone = useMutation(api.externalTasks.markTaskComplete);

  // @ts-ignore
  const integrations = useQuery(
    api.integrations.getUserIntegrations as any,
    convexUserId ? { userId: convexUserId } : "skip"
  ) ?? [];
  const connectedPlatforms = (integrations as any[]).map((i: any) => i.platform);

  // @ts-ignore
  const recentJobs = useQuery(
    api.agentJobs.listRecentJobs as any,
    convexUserId ? { userId: convexUserId } : "skip"
  ) ?? [];

  // @ts-ignore
  const tasks = useQuery(
    api.externalTasks.getTasksByUser as any,
    convexUserId ? { userId: convexUserId } : "skip"
  ) ?? [];

  const goalSummary = useQuery(
    api.goals.getCurrentSummary,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  // Clear active job marker after completion
  // @ts-ignore
  const activeJob = useQuery(
    api.agentJobs.getJob as any,
    activeJobId ? { jobId: activeJobId } : "skip"
  );
  useEffect(() => {
    if (!activeJob) return;
    if (activeJob.status === "done" || activeJob.status === "failed") {
      const t = setTimeout(() => setActiveJobId(null), 1500);
      return () => clearTimeout(t);
    }
  }, [activeJob?.status]);

  // Scroll to bottom of thread when new jobs arrive
  useEffect(() => {
    threadBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [(recentJobs as any[]).length]);

  // Split jobs: morning briefing (auto, shown as card) vs conversation (user-initiated)
  const todayStart = startOfToday();
  const todayJobs = (recentJobs as any[]).filter((j: any) => j.createdAt >= todayStart);
  const morningBriefing = todayJobs
    .slice()
    .reverse()
    .find(
      (j: any) =>
        j.status === "done" &&
        j.result?.briefing &&
        (j.intent as string).toLowerCase().startsWith("morning briefing")
    );
  // Conversation thread = user-initiated jobs (not morning briefing), oldest-first
  const conversationJobs = todayJobs
    .filter(
      (j: any) => !(j.intent as string).toLowerCase().startsWith("morning briefing")
    )
    .reverse();

  // Sort tasks: overdue → due today → due later → no date
  const sortedTasks = [...(tasks as any[])].sort((a, b) => {
    const today = todayIso();
    const aOver = isOverdue(a.dueDate);
    const bOver = isOverdue(b.dueDate);
    if (aOver !== bOver) return aOver ? -1 : 1;
    const aToday = a.dueDate === today;
    const bToday = b.dueDate === today;
    if (aToday !== bToday) return aToday ? -1 : 1;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  // Goals needing attention this period
  const goalsAtRisk = goalSummary
    ? (Object.entries(goalSummary) as [string, any][]).filter(
        ([, v]) => v.total > 0 && v.completed < v.total
      )
    : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = intent.trim();
    if (!text || !convexUserId || submitting) return;
    setSubmitting(true);
    setIntent("");
    try {
      // @ts-ignore
      const jobId = await createJob({ userId: convexUserId, intent: text });
      setActiveJobId(jobId as string);
      // fire-and-forget
      void fetch("/api/agent/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          intent: text,
          convexUserId,
          connectedPlatforms,
          userName: (convexUser as any)?.name ?? firstName,
          userTimezone: (convexUser as any)?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
    } finally {
      setSubmitting(false);
      textareaRef.current?.focus();
    }
  }

  const firstName = user?.firstName ?? user?.fullName?.split(" ")[0] ?? "there";

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-2xl space-y-5">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6 pb-8">
      {/* Date + greeting */}
      <motion.div {...fadeUp(0)}>
        <p className="text-xs text-muted-foreground font-medium tracking-wide mb-1 select-none">
          {todayLabel()}
        </p>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">
          {greet(firstName)}
        </h1>
      </motion.div>

      {/* Morning briefing card */}
      <AnimatePresence>
        {morningBriefing && (
          <motion.div
            key="briefing"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 space-y-3"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary/60" />
              <span className="text-[11px] font-semibold text-primary/60 uppercase tracking-[0.14em]">
                Morning briefing
              </span>
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed italic">
              {morningBriefing.result.briefing}
            </p>
            {Array.isArray(morningBriefing.result.priorities) &&
              morningBriefing.result.priorities.length > 0 && (
                <ol className="space-y-1.5 border-t border-primary/10 pt-3">
                  {(morningBriefing.result.priorities as string[])
                    .slice(0, 3)
                    .map((p: string, i: number) => (
                      <li key={i} className="flex gap-2.5 text-sm">
                        <span className="text-[11px] font-bold text-primary/40 shrink-0 w-4 mt-px">
                          {i + 1}.
                        </span>
                        <span className="text-muted-foreground">{p}</span>
                      </li>
                    ))}
                </ol>
              )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tasks */}
      <motion.div {...fadeUp(1)} className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em]">
            Open tasks
          </h2>
          {sortedTasks.length > 0 && (
            <span className="text-[11px] text-muted-foreground/50">{sortedTasks.length}</span>
          )}
        </div>

        {sortedTasks.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-5 py-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {connectedPlatforms.length === 0
                ? 'Connect a platform in Integrations, then ask your assistant to "pull my tasks."'
                : 'No open tasks synced yet. Try: "Pull my Trello tasks" or "What\'s overdue in Asana?"'}
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {sortedTasks.slice(0, 20).map((task: any) => {
              const overdue = isOverdue(task.dueDate);
              const dueToday = task.dueDate === todayIso();
              return (
                <div
                  key={task._id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors group"
                >
                  <button
                    onClick={() =>
                      // @ts-ignore
                      markDone({ userId: convexUserId, taskId: task._id })
                    }
                    className="shrink-0 text-muted-foreground/30 hover:text-emerald-500 transition-colors"
                    title="Mark done"
                  >
                    <Circle className="w-4 h-4" />
                  </button>
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      PLATFORM_DOT[task.platform] ?? "bg-muted-foreground/30"
                    )}
                  />
                  <span className="text-sm flex-1 min-w-0 truncate">{task.title}</span>
                  {task.dueDate && (
                    <span
                      className={cn(
                        "text-[11px] shrink-0 hidden sm:flex items-center gap-0.5",
                        overdue
                          ? "text-destructive font-semibold"
                          : dueToday
                          ? "text-amber-500 font-medium"
                          : "text-muted-foreground/50"
                      )}
                    >
                      {overdue && <AlertTriangle className="w-3 h-3" />}
                      {task.dueDate}
                    </span>
                  )}
                  {task.url && (
                    <a
                      href={task.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/40 hover:text-foreground p-0.5 rounded"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            })}
            {sortedTasks.length > 20 && (
              <div className="px-4 py-2.5 text-center text-xs text-muted-foreground">
                +{sortedTasks.length - 20} more — ask your assistant to filter by priority
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Goals at risk */}
      {goalsAtRisk.length > 0 && (
        <motion.div {...fadeUp(2)} className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em]">
            Goals needing attention
          </h2>
          <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
            {goalsAtRisk.map(([category, stats]: [string, any]) => (
              <div key={category} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium capitalize">{category} goals</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {stats.completed} of {stats.total} complete
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {Array.from({ length: Math.min(stats.total, 8) }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        i < stats.completed ? "bg-emerald-400" : "bg-border"
                      )}
                    />
                  ))}
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Conversation thread */}
      {conversationJobs.length > 0 && (
        <motion.div {...fadeUp(3)} className="space-y-2">
          <h2 className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-[0.14em]">
            Today&apos;s conversation
          </h2>
          <div className="space-y-4">
            {conversationJobs.map((job: any) => (
              <div key={job._id} className="space-y-2">
                {/* User turn */}
                <div className="flex justify-end">
                  <div className="max-w-[82%] rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5">
                    <p className="text-sm leading-relaxed">{job.intent}</p>
                  </div>
                </div>
                {/* Agent turn */}
                {job.status !== "queued" || job.progressLog?.length > 0 ? (
                  <AgentBubble job={job} />
                ) : null}
              </div>
            ))}
            <div ref={threadBottomRef} />
          </div>
        </motion.div>
      )}

      {/* Command bar */}
      <motion.div {...fadeUp(4)}>
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <Bot className="w-4 h-4 text-muted-foreground/40 mt-1 shrink-0" />
            <textarea
              ref={textareaRef}
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit(e as unknown as React.FormEvent);
                }
              }}
              placeholder="Pull my Trello tasks. Add a meeting tomorrow at 2pm. What's overdue?"
              rows={2}
              disabled={submitting}
              className="flex-1 text-sm bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/35 leading-relaxed disabled:opacity-50"
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[11px] text-muted-foreground/40">
              {connectedPlatforms.length > 0
                ? `${connectedPlatforms.length} platform${connectedPlatforms.length > 1 ? "s" : ""} connected`
                : "No platforms connected"}
            </span>
            <button
              type="submit"
              disabled={!intent.trim() || submitting}
              className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold px-4 py-1.5 disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
