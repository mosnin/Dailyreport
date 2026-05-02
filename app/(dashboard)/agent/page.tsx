"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { fadeUp } from "@/lib/motion";
import { Bot, User, History } from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: number;
  status?: string;
};

function formatAssistant(job: any): string {
  if (job.status === "failed") return job.error ?? "Something went wrong.";
  if (!job.result) return "Working on it…";
  if (job.result.briefing) {
    const priorities = Array.isArray(job.result.priorities) ? job.result.priorities.slice(0, 3) : [];
    return [job.result.briefing, ...priorities.map((p: string, i: number) => `${i + 1}. ${p}`)].join("\n");
  }
  return job.result.summary ?? "Done.";
}

export default function AgentPage() {
  const { convexUserId, convexUser, isLoading } = useConvexUser();
  const [intent, setIntent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // @ts-ignore
  const createJob = useMutation(api.agentJobs.createJob);
  // @ts-ignore
  const integrations = useQuery(api.integrations.getUserIntegrations, convexUserId ? { userId: convexUserId } : "skip") ?? [];
  const connectedPlatforms = (integrations as any[]).map((i: any) => i.platform);

  // @ts-ignore
  const recentJobs = useQuery(api.agentJobs.listRecentJobs, convexUserId ? { userId: convexUserId } : "skip") ?? [];
  // @ts-ignore
  const selectedJob = useQuery(api.agentJobs.getJob, selectedJobId ? { jobId: selectedJobId } : "skip");

  const activeJob = selectedJob ?? (recentJobs as any[])[0] ?? null;

  const messages: ChatMessage[] = useMemo(() => {
    if (!activeJob) return [];
    const createdTs = activeJob._creationTime ?? Date.now();
    const out: ChatMessage[] = [
      { id: `${activeJob._id}-user`, role: "user", text: activeJob.intent ?? "", ts: createdTs, status: activeJob.status },
      { id: `${activeJob._id}-assistant`, role: "assistant", text: formatAssistant(activeJob), ts: createdTs + 1, status: activeJob.status },
    ];
    const progress = Array.isArray(activeJob.progressLog) ? activeJob.progressLog : [];
    for (const p of progress) {
      out.push({ id: `${activeJob._id}-progress-${p.ts}`, role: "assistant", text: `Thinking: ${p.text}`, ts: p.ts, status: "running" });
    }
    return out.sort((a, b) => a.ts - b.ts);
  }, [activeJob]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!intent.trim() || !convexUserId) return;
    setSubmitting(true);
    try {
      // @ts-ignore
      const jobId = await createJob({ userId: convexUserId, intent: intent.trim() });
      setSelectedJobId(jobId);
      const savedIntent = intent.trim();
      setIntent("");
      const triggerRes = await fetch("/api/agent/trigger", {
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
      if (!triggerRes.ok) throw new Error(await triggerRes.text());
    } catch (err) {
      console.error("[agent-page/trigger]", err);
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || !convexUserId) {
    return <div className="max-w-5xl"><Skeleton className="h-[520px] w-full rounded-2xl" /></div>;
  }

  return (
    <div className="max-w-5xl grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 pb-8">
      <motion.aside {...fadeUp(0)} className="rounded-2xl border border-border bg-card p-3 h-fit">
        <div className="flex items-center gap-2 px-2 pb-2 border-b border-border">
          <History className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Conversation history</p>
        </div>
        <div className="pt-2 space-y-1 max-h-[580px] overflow-y-auto">
          {(recentJobs as any[]).map((job: any) => (
            <button
              key={job._id}
              onClick={() => setSelectedJobId(job._id)}
              className={cn(
                "w-full text-left rounded-lg px-2.5 py-2 hover:bg-muted/60",
                (selectedJobId ? selectedJobId === job._id : (recentJobs as any[])[0]?._id === job._id) && "bg-muted"
              )}
            >
              <p className="text-xs text-foreground truncate">{job.intent}</p>
              <p className="text-[11px] text-muted-foreground">{new Date(job._creationTime).toLocaleString()}</p>
            </button>
          ))}
        </div>
      </motion.aside>

      <motion.main {...fadeUp(1)} className="rounded-2xl border border-border bg-card flex flex-col min-h-[580px]">
        <div className="p-4 border-b border-border">
          <h1 className="font-heading text-xl font-semibold">Agent Chat</h1>
          <p className="text-sm text-muted-foreground">Claude-style conversation with memory and job history.</p>
        </div>

        <div className="flex-1 p-4 space-y-3 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Start a conversation to create your first run.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && <Bot className="w-4 h-4 mt-1 text-muted-foreground" />}
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  {m.text}
                  {m.status === "running" && <span className="ml-2 inline-flex gap-1 align-middle"><span className="animate-pulse">•</span><span className="animate-pulse [animation-delay:120ms]">•</span><span className="animate-pulse [animation-delay:240ms]">•</span></span>}
                </div>
                {m.role === "user" && <User className="w-4 h-4 mt-1 text-muted-foreground" />}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-border">
          <textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            rows={3}
            placeholder="Message your agent…"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none"
            disabled={submitting}
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={!intent.trim() || submitting}
              className="rounded-xl bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </motion.main>
    </div>
  );
}
