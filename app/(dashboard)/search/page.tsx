"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp } from "@/lib/motion";

type SearchResult = {
  _id: string;
  type: "daily" | "weekly";
  date?: string;
  weekStartDate?: string;
  responses: Record<string, string>;
  score: number;
};

const ease = [0.16, 1, 0.3, 1] as const;

export default function SearchPage() {
  const { convexUserId, isLoading } = useConvexUser();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
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
      setSearchError(err instanceof Error ? err.message : "Search failed. Please try again.");
      setResults(null);
    } finally {
      setSearching(false);
    }
  }

  if (isLoading || !convexUserId) {
    return <Skeleton className="h-12 w-full max-w-lg" />;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div {...fadeUp(0)}>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">Search</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Semantically search across all your past reports.
        </p>
      </motion.div>

      <motion.form {...fadeUp(0.08)} onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='e.g. "weeks I felt most productive"'
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button type="submit" disabled={searching || !query.trim()}>
            <Search className="w-4 h-4 mr-2" />
            {searching ? "Searching..." : "Search"}
          </Button>
        </motion.div>
      </motion.form>

      {searchError && (
        <motion.p {...fadeUp(0)} className="text-sm text-destructive">{searchError}</motion.p>
      )}

      <AnimatePresence mode="wait">
        {results !== null && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {results.length === 0 ? (
              <motion.p {...fadeUp(0)} className="text-sm text-muted-foreground">No matching reports found.</motion.p>
            ) : (
              results.map((r, index) => (
                <motion.div
                  key={r._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease, delay: index * 0.055 }}
                >
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-center gap-2">
                      <Badge variant={r.type === "daily" ? "default" : "secondary"}>
                        {r.type === "daily" ? "Daily" : "Weekly"}
                      </Badge>
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {r.date ?? r.weekStartDate}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-sm">
                        {Object.entries(r.responses ?? {})
                          .slice(0, 2)
                          .map(([k, v]) => (
                            <p key={k} className="text-muted-foreground line-clamp-2">
                              <span className="font-medium text-foreground capitalize">
                                {k.replace(/_/g, " ")}:
                              </span>{" "}
                              {v}
                            </p>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
