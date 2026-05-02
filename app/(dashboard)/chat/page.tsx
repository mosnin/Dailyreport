"use client";

import { useState, useRef, useEffect } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import { ArrowRight, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp } from "@/lib/motion";

// ── Types ─────────────────────────────────────────────────────────────────

type Message = {
  role: "user" | "assistant";
  content: string;
};

// ── Message components ────────────────────────────────────────────────────

function UserMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%] bg-foreground text-background rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] border-l-2 border-primary/40 pl-4 py-1">
        <div className="text-sm leading-[1.85] text-foreground prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] border-l-2 border-primary/40 pl-4 py-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary">
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          >
            Thinking
          </motion.span>
          <motion.span
            animate={{ x: [0, 2, 0], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 0.9, repeat: Infinity }}
          >
            •••
          </motion.span>
        </div>
      </div>
    </div>
  );
}

// ── Suggested questions ───────────────────────────────────────────────────

const SUGGESTED = [
  "What emotional patterns keep showing up in my reports?",
  "When have I been most energized and why?",
  "What problems am I not making progress on?",
  "How has my focus on my goals changed over time?",
];

const ease = [0.16, 1, 0.3, 1] as const;

// ── Main page ─────────────────────────────────────────────────────────────

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


  async function streamAssistantReply(fullText: string) {
    const assistantIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    const chunk = Math.max(1, Math.floor(fullText.length / 42));
    for (let i = 0; i < fullText.length; i += chunk) {
      const slice = fullText.slice(0, i + chunk);
      setMessages((prev) => {
        const next = [...prev];
        if (next[assistantIndex]) next[assistantIndex] = { role: "assistant", content: slice };
        return next;
      });
      await new Promise((r) => setTimeout(r, 22));
    }
  }

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
      await streamAssistantReply(reply as string);
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
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <motion.div {...fadeUp(0)} className="shrink-0 pb-6 border-b border-border/30">
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/40 mb-1.5">
Agent OS
        </p>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">
Chat with your chief of staff.
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every report you&apos;ve written is searchable. Your patterns, your progress, your words.
        </p>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 py-6 space-y-6">
        {empty && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col justify-center h-full gap-8 py-8"
          >
            <p className="font-heading italic text-muted-foreground/60 text-base leading-relaxed max-w-xs">
              &ldquo;The unexamined life is not worth living.&rdquo;
            </p>

            <div className="space-y-2">
              <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/40 mb-3">
                Start with a question
              </p>
              {SUGGESTED.map((s) => (
                <motion.button
                  key={s}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => send(s)}
                  className="w-full text-left group flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/30 transition-all"
                >
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors leading-snug">
                    {s}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0 group-hover:text-primary/50 transition-colors" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease }}
            >
              {m.role === "user" ? (
                <UserMessage content={m.content} />
              ) : (
                <AssistantMessage content={m.content} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {thinking && <ThinkingIndicator />}
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
            placeholder="What would you like to understand about yourself?"
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none placeholder:text-muted-foreground/50 max-h-32 leading-relaxed"
            style={{ height: "auto" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
            }}
          />
          <motion.button
            onClick={() => send(input)}
            disabled={!input.trim() || thinking}
            whileTap={{ scale: 0.93 }}
            className="shrink-0 w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </motion.button>
        </div>
        <p className="text-[11px] text-muted-foreground/50 text-center mt-2">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
