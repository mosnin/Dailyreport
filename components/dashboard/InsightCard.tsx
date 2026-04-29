"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export function InsightCard({ userId }: { userId: Id<"users"> }) {
  const insight = useQuery(api.aiInternal.getLatestInsight, { userId });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          Weekly AI Insight
        </CardTitle>
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
