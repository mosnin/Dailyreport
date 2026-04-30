"use client";

import { useConvexUser } from "@/hooks/useConvexUser";
import { CalendarGrid } from "@/components/dashboard/CalendarGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "motion/react";
import { fadeUp } from "@/lib/motion";

export default function CalendarPage() {
  const { convexUserId, isLoading } = useConvexUser();

  if (isLoading || !convexUserId) {
    return <Skeleton className="h-96 w-full max-w-lg" />;
  }

  return (
    <div className="space-y-6 max-w-lg">
      <motion.div {...fadeUp(0)}>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Click any past day to view your report.
        </p>
      </motion.div>
      <motion.div {...fadeUp(0.1)}>
        <CalendarGrid userId={convexUserId} clickable />
      </motion.div>
    </div>
  );
}
