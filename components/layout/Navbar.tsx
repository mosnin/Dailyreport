"use client";

import Link from "next/link";
import Image from "next/image";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import { Flame } from "lucide-react";

export function Navbar() {
  const { convexUserId } = useConvexUser();
  const { totalDone, streak } = useTodayStatus(convexUserId);

  return (
    <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-1.5">
      <Link href="/today" className="flex items-center">
        <Image src="/logo-dark.png" alt="Daily Report" width={1800} height={400} quality={100} priority className="h-5 w-auto" />
      </Link>

      {convexUserId && (
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="px-2 py-1 rounded-full bg-white/10 text-muted-foreground numeral">{totalDone} done</span>
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
