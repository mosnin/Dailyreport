"use client";

import { useState, useRef } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Search, BookOpen, NotepadText, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

type SearchResult = {
  _id: string;
  type: "daily" | "weekly";
  date?: string;
  weekStartDate?: string;
  responses: Record<string, unknown>;
  score: number;
};

const SUGGESTED = [
  "When was I most productive?",
  "Times I felt drained or overwhelmed",
  "What problems have I been solving?",
  "Moments of progress on my goals",
  "Who have I been spending time with?",
];

function extractPreview(responses: Record<string, unknown>): string {
  const keys = [
    "dayActivity",
    "weekActivity",
    "emotionalDrain",
    "tomorrowPlan",
    "nextWeekPlan",
  ];
  for (const key of keys) {
    const val = responses[key];
    if (typeof val === "string" && val.trim().length > 20) {
      return val.trim().slice(0, 180);
    }
  }
  const first = Object.values(responses).find(
    (v) => typeof v === "string" && (v as string).trim().length > 10
  );
  return typeof first === "string" ? first.trim().slice(0, 180) : "";
}

function formatDate(result: SearchResult): string {
  try {
    const d = result.date ?? result.weekStartDate;
    if (!d) return "";
    return format(
      parseISO(d),
      result.type === "weekly" ? "'Week of' MMM d, yyyy" : "EEEE, MMMM d, yyyy"
    );
  } catch {
    return result.date ?? result.weekStartDate ?? "";
  }
}

export default function SearchPage() {
  const { convexUserId } = useConvexUser();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const semanticSearch = useAction(api.ai.semanticSearch);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!convexUserId || !query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await semanticSearch({ userId: convexUserId, query });
      setResults(res as SearchResult[]);
    } catch (err) {
      setSearchError(
        err instanceof Error ? err.message : "Search failed. Please try again."
      );
      setResults(null);
    } finally {
      setSearching(false);
    }
  }

  function handleSuggestion(suggestion: string) {
    setQuery(suggestion);
    inputRef.current?.focus();
    // Trigger search immediately
    if (!convexUserId) return;
    setSearching(true);
    setSearchError(null);
    semanticSearch({ userId: convexUserId, query: suggestion })
      .then((res) => setResults(res as SearchResult[]))
      .catch((err) => {
        setSearchError(
          err instanceof Error ? err.message : "Search failed. Please try again."
        );
        setResults(null);
      })
      .finally(() => setSearching(false));
  }

  const showInitialEmpty = results === null && !searching;
  const showNoResults = results !== null && results.length === 0 && !searching;

  return (
    <div className="max-w-2xl space-y-10">
      {/* Header */}
      <motion.div {...fadeUp(0)} className="space-y-1.5">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60">
          Search
        </p>
        <h1 className="font-heading text-[2rem] leading-tight">
          What are you looking for?
        </h1>
        <p className="text-sm text-muted-foreground">
          Every entry is here. Ask in plain language.
        </p>
      </motion.div>

      {/* Search bar */}
      <motion.form {...fadeUp(0.06)} onSubmit={handleSearch}>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card shadow-sm px-5 py-4">
          <Search className="w-4 h-4 shrink-0 text-muted-foreground/40" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask anything about your past…"
            className="flex-1 bg-transparent text-base placeholder:text-muted-foreground/40 focus:outline-none"
          />
          {searching && (
            <Loader2 className="w-4 h-4 shrink-0 text-muted-foreground/40 animate-spin" />
          )}
        </div>
        {/* Hidden submit for Enter key */}
        <button type="submit" className="sr-only">Search</button>
      </motion.form>

      {/* Error */}
      {searchError && (
        <motion.p {...fadeUp(0)} className="text-sm text-destructive">
          {searchError}
        </motion.p>
      )}

      {/* Suggested queries — shown only when no results and not loading */}
      <AnimatePresence>
        {showInitialEmpty && !searching && (
          <motion.div
            key="suggestions"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3"
          >
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/50">
              Try asking
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSuggestion(s)}
                  className="rounded-full border border-border/50 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Initial empty state */}
      <AnimatePresence>
        {showInitialEmpty && (
          <motion.div
            key="initial-empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-4 py-16 text-center"
          >
            <BookOpen className="w-8 h-8 text-muted-foreground/20" />
            <p className="font-heading italic text-xl text-muted-foreground/30">
              Your journal is waiting to be found.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No-results state */}
      <AnimatePresence>
        {showNoResults && (
          <motion.div
            key="no-results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-2 py-16 text-center"
          >
            <p className="font-heading italic text-lg text-muted-foreground/50">
              Nothing surfaced.
            </p>
            <p className="text-sm text-muted-foreground/40">
              Try different words or phrases.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence mode="wait">
        {results !== null && results.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {results.map((r, index) => {
              const preview = extractPreview(r.responses);
              const dateLabel = formatDate(r);
              const Icon = r.type === "daily" ? NotepadText : BookOpen;
              const typeLabel = r.type === "daily" ? "Daily" : "Weekly Review";
              // Score bar width — score is 0 to 1 (higher is more relevant)
              const barWidth = Math.max(8, Math.round(r.score * 100));

              return (
                <motion.div
                  key={r._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.45,
                    ease: [0.16, 1, 0.3, 1],
                    delay: index * 0.06,
                  }}
                  className={cn(
                    "py-5 space-y-2",
                    index > 0 && "border-t border-border/40"
                  )}
                >
                  {/* Meta row */}
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/50">
                      {typeLabel}
                    </span>
                    {dateLabel && (
                      <>
                        <span className="text-muted-foreground/30 text-[10px]">
                          ·
                        </span>
                        <span className="text-[10px] text-muted-foreground/50">
                          {dateLabel}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Preview text */}
                  {preview && (
                    <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
                      {preview}
                    </p>
                  )}

                  {/* Relevance bar */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="h-px flex-1 bg-border/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-foreground/20 rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground/30 tabular-nums shrink-0">
                      {Math.round(r.score * 100)}%
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
