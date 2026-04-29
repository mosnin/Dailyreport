"use client";

import { useConvexUser } from "@/hooks/useConvexUser";
import { GoalSection } from "@/components/goals/GoalSection";
import { Skeleton } from "@/components/ui/skeleton";
import type { GoalCategory } from "@/lib/utils";

const CATEGORIES: GoalCategory[] = ["lifelong", "yearly", "quarterly", "monthly", "weekly"];

export default function GoalsPage() {
  const { convexUserId, isLoading } = useConvexUser();

  if (isLoading || !convexUserId) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-8 w-32" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Goals</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Track what matters across every time horizon.
        </p>
      </div>
      <div className="space-y-4">
        {CATEGORIES.map((category) => (
          <GoalSection key={category} userId={convexUserId} category={category} />
        ))}
      </div>
    </div>
  );
}
