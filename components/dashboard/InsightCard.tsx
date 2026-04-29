"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BrainCircuit, RefreshCw } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-500" />
            Weekly AI Insight
          </CardTitle>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40"
            title="Regenerate insight from this week's reports"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {insight === undefined ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : insight === null ? (
          <p className="text-sm text-muted-foreground">
            Complete your first weekly report to receive an AI-generated insight about your progress.{" "}
            <Link href="/reports/weekly" className="text-primary underline-offset-2 hover:underline">
              Submit weekly report →
            </Link>
          </p>
        ) : (
          <p className="text-sm leading-relaxed">{insight.content}</p>
        )}
      </CardContent>
    </Card>
  );
}
