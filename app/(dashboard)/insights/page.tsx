"use client";

import { useState, useRef, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { ChartBlock, type ChartSpec } from "@/components/insights/ChartBlock";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Sparkles, BarChart2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

type HistoryItem = { role: "user" | "assistant"; content: string };

type Message =
  | { role: "user"; text: string }
  | { role: "assistant"; text: string; chart: ChartSpec | null };

const STARTER_PROMPTS = [
  "What are my biggest weak areas based on my reports?",
  "Show me my daily submission rate over the past few weeks.",
  "What recurring problems am I facing?",
  "How has my overall performance trended over time?",
  "What should I focus on improving this week?",
];

export default function InsightsPage() {
  const { convexUserId, isLoading } = useConvexUser();
  const insightsChat = useAction(api.ai.insightsChat);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    if (!convexUserId || !text.trim() || loading) return;

    const userMsg: Message = { role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const history: HistoryItem[] = messages.map((m) =>
      m.role === "user"
        ? { role: "user", content: m.text }
        : { role: "assistant", content: m.text }
    );

    try {
      const result = await insightsChat({
        userId: convexUserId,
        message: text,
        history,
      });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: result.message ?? "No response.",
          chart: result.chart ?? null,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Something went wrong. Please try again.",
          chart: null,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function handleInitialAnalysis() {
    if (initialized || !convexUserId) return;
    setInitialized(true);
    await send("Give me an overview of my performance and highlight the most important areas to improve. Include a chart if the data supports it.");
  }

  useEffect(() => {
    if (!isLoading && convexUserId && !initialized) {
      handleInitialAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, convexUserId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="shrink-0 mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          AI Insights
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Ask about your patterns, weak areas, and progress. Charts generated on demand.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && loading && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
            {msg.role === "user" ? (
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-sm">
                {msg.text}
              </div>
            ) : (
              <div className="max-w-[90%] space-y-1">
                <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 text-sm prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>
                {msg.chart && <ChartBlock chart={msg.chart} />}
              </div>
            )}
          </div>
        ))}

        {loading && messages.length > 0 && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Starter prompts — shown only before any follow-up user messages */}
      {messages.filter((m) => m.role === "user").length <= 1 && !loading && (
        <div className="shrink-0 pt-3 pb-2 flex flex-wrap gap-2">
          {STARTER_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              className="text-xs border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <BarChart2 className="w-3 h-3" />
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="shrink-0 pt-3 border-t border-border flex gap-2 items-end">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Ask about your data…"
          rows={2}
          className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          disabled={loading}
        />
        <Button type="submit" size="sm" disabled={!input.trim() || loading} className="h-10 px-3">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
