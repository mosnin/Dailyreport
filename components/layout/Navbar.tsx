"use client";

import Link from "next/link";
import Image from "next/image";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { convexUserId } = useConvexUser();
  const { totalDone, reportDone, affirmDone, vizDone } = useTodayStatus(convexUserId);

  return (
    <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur safe-top">
      <Link href="/dashboard" className="flex items-center">
        <Image src="/logo-light.png" alt="DailyReport" width={1800} height={400} quality={100} className="h-7 w-auto dark:hidden" />
        <Image src="/logo-dark.png" alt="DailyReport" width={1800} height={400} quality={100} className="h-7 w-auto hidden dark:block" />
      </Link>

      {convexUserId && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
          <span className={cn("w-1.5 h-1.5 rounded-full", reportDone ? "bg-emerald-400" : "bg-border")} />
          <span className={cn("w-1.5 h-1.5 rounded-full", affirmDone ? "bg-amber-400" : "bg-border")} />
          <span className={cn("w-1.5 h-1.5 rounded-full", vizDone ? "bg-sky-400" : "bg-border")} />
          <span className="ml-0.5">{totalDone}/3</span>
        </div>
      )}
    </header>
  );
}
