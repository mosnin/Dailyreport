"use client";

import Link from "next/link";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import { Flame } from "lucide-react";

export function Navbar() {
  const { convexUserId } = useConvexUser();
  const { totalDone, streak } = useTodayStatus(convexUserId);

  return (
    <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur safe-top">
      <Link href="/today" className="flex items-center gap-2">
        <span className="grid place-items-center w-7 h-7 rounded-lg bg-primary text-primary-foreground font-bold">A</span>
        <span className="font-heading text-base font-bold tracking-tight">Ascend</span>
      </Link>

      {convexUserId && (
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="px-2 py-1 rounded-full bg-muted text-muted-foreground numeral">{totalDone} done</span>
          {streak > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/15 text-primary">
              <Flame className="w-3 h-3" />
              <span className="numeral">{streak}</span>
            </span>
          )}
        </div>
      )}
    </header>
  );
}
