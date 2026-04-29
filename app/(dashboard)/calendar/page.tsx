"use client";

import { useConvexUser } from "@/hooks/useConvexUser";
import { CalendarGrid } from "@/components/dashboard/CalendarGrid";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarPage() {
  const { convexUserId, isLoading } = useConvexUser();

  if (isLoading || !convexUserId) {
    return <Skeleton className="h-96 w-full max-w-lg" />;
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your submission history at a glance.
        </p>
      </div>
      <CalendarGrid userId={convexUserId} />
    </div>
  );
}
