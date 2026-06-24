"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { BentoCard } from "@/components/bento/BentoCard";
import { AREAS, type AreaKey } from "@/lib/areas";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";

type Pattern = { title: string; detail: string; area: string };

export function AIPatterns({ userId }: { userId: Id<"users"> }) {
  const analyze = useAction(api.lifePatterns.analyze);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<Pattern[] | null>(null);

  async function run() {
    setLoading(true);
    try {
      const res = await analyze({ userId });
      setSummary(res.summary);
      setPatterns(res.patterns);
    } catch {
      toast.error("Could not analyze patterns right now.");
    } finally {
      setLoading(false);
    }
  }

  const colorFor = (area: string) => (AREAS[area as AreaKey]?.color ?? "var(--primary)");

  return (
    <BentoCard delay={0.12}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">AI patterns</h2>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-4 py-1.5 text-sm font-semibold disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? "Analyzing…" : patterns ? "Re-run" : "Find patterns"}
        </button>
      </div>

      {!patterns && !loading && (
        <p className="text-sm text-muted-foreground">
          Let AI scan every area together — sleep, mood, money, execution, projects — and surface the cross-domain
          patterns moving your Life Score.
        </p>
      )}

      {summary && <p className="text-sm text-foreground/90 leading-relaxed mb-3">{summary}</p>}

      {patterns && patterns.length > 0 && (
        <div className="space-y-2">
          {patterns.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-background/40 p-3.5 flex gap-3"
            >
              <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: colorFor(p.area) }} />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{p.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{p.detail}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </BentoCard>
  );
}
