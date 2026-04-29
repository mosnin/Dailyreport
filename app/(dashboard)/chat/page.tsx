"use client";

import { useState, useRef, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { MessageSquare, Send, Bot, User } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────

type Message = {
  role: "user" | "assistant";
  content: string;
};

// ── Bubble ────────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <div
        className={cn(
          "w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold mt-0.5",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center bg-muted text-muted-foreground mt-0.5">
        <Bot className="w-3.5 h-3.5" />
      </div>
      <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

const SUGGESTED = [
  "What patterns do you see in my emotional state lately?",
  "When have I been most productive this month?",
  "What problems keep coming up in my reports?",
  "How consistent have I been with my daily goals?",
];

export default function ChatPage() {
  const { convexUserId, isLoading } = useConvexUser();
  const chat = useAction(api.ai.chat);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function send(text: string) {
    if (!convexUserId || !text.trim() || thinking) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setThinking(true);
    try {
      const reply = await chat({
        userId: convexUserId,
        message: userMsg.content,
        history: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      setMessages([...next, { role: "assistant", content: reply as string }]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setThinking(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const empty = messages.length === 0;

  return (
    <div className="max-w-2xl flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="shrink-0 pb-4">
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">Chat</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ask anything about your history — the AI searches your past reports to answer.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 py-4 space-y-4">
        {empty && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-8">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-7 h-7 text-primary" />
            </div>
            <div className="space-y-1.5">
              <p className="font-semibold text-lg">Ask about your history</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Your past reports are searched semantically to give you grounded answers.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-xs text-muted-foreground border border-border rounded-xl px-3 py-2.5 hover:border-primary/40 hover:text-foreground hover:bg-accent/30 transition-all leading-relaxed"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} msg={m} />
        ))}
        {thinking && <ThinkingBubble />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 pt-3 pb-2">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-background px-4 py-3 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your reports…"
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none placeholder:text-muted-foreground/50 max-h-32 leading-relaxed"
            style={{ height: "auto" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || thinking}
            className="shrink-0 w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground/50 text-center mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
