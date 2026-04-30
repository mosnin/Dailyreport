"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { BrainCircuit, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp } from "@/lib/motion";

export function InsightCard({ userId }: { userId: Id<"users"> }) {
  const insight = useQuery(api.aiInternal.getLatestInsight, { userId });
  const regenerate = useAction(api.ai.regenerateWeeklyInsight);
  const [regenerating, setRegenerating] = useState(false);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      await regenerate({ userId });
      toast.success("Weekly insight refreshed.");
    } catch {
      toast.error("Couldn't regenerate. Make sure you have weekly reports submitted.");
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <motion.div
      {...fadeUp(0.1)}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <motion.div
            animate={regenerating ? { rotate: 360 } : { rotate: 0 }}
            transition={regenerating ? { repeat: Infinity, duration: 1.2, ease: "linear" } : { duration: 0 }}
          >
            <BrainCircuit className="w-5 h-5 text-indigo-500" />
          </motion.div>
          <span className="text-sm font-semibold">Weekly AI Insight</span>
        </div>
        <motion.button
          onClick={handleRegenerate}
          disabled={regenerating}
          whileTap={{ scale: 0.9 }}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
          title="Regenerate insight from this week's reports"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {insight === undefined ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </motion.div>
        ) : insight === null ? (
          <motion.p
            key="empty"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm text-muted-foreground"
          >
            Complete your first weekly report to receive an AI-generated insight about your progress.{" "}
            <Link href="/reports/weekly" className="text-primary underline-offset-2 hover:underline">
              Submit weekly report →
            </Link>
          </motion.p>
        ) : (
          <motion.p
            key={insight.content}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm leading-relaxed"
          >
            {insight.content}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
