"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import { useState } from "react";
import {
  Gauge,
  CalendarDays,
  NotepadText,
  BookOpen,
  Crosshair,
  AlertOctagon,
  Flame,
  Telescope,
  BrainCircuit,
  ScanSearch,
  SlidersHorizontal,
  LogOut,
  AlignJustify,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Gauge },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
    ],
  },
  {
    label: "Reports",
    items: [
      { href: "/reports/daily", label: "Daily Report", icon: NotepadText },
      { href: "/reports/weekly", label: "Weekly Report", icon: BookOpen },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/goals", label: "Goals", icon: Crosshair },
      { href: "/problems", label: "Problems", icon: AlertOctagon },
      { href: "/affirmations", label: "Affirmations", icon: Flame },
      { href: "/dreams", label: "Dreams", icon: Telescope },
    ],
  },
  {
    label: "Discover",
    items: [
      { href: "/insights", label: "AI Insights", icon: BrainCircuit },
      { href: "/search", label: "Search", icon: ScanSearch },
    ],
  },
];

export function Navbar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { convexUserId } = useConvexUser();
  const { totalDone, reportDone, affirmDone, vizDone } = useTodayStatus(convexUserId);
  const [open, setOpen] = useState(false);

  return (
    <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur">
      <Link href="/dashboard" className="flex items-center">
        <Image src="/logo-light.png" alt="DailyReport" width={1800} height={400} quality={100} className="h-7 w-auto dark:hidden" />
        <Image src="/logo-dark.png" alt="DailyReport" width={1800} height={400} quality={100} className="h-7 w-auto hidden dark:block" />
      </Link>

      <div className="flex items-center gap-2">
        {/* X/3 practice status badge */}
        {convexUserId && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
            <span className={cn("w-1.5 h-1.5 rounded-full", reportDone ? "bg-emerald-400" : "bg-border")} />
            <span className={cn("w-1.5 h-1.5 rounded-full", affirmDone ? "bg-amber-400" : "bg-border")} />
            <span className={cn("w-1.5 h-1.5 rounded-full", vizDone ? "bg-sky-400" : "bg-border")} />
            <span className="ml-0.5">{totalDone}/3</span>
          </div>
        )}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            onClick={() => setOpen(true)}
          >
            <AlignJustify className="w-5 h-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <div className="flex items-center px-5 py-4 border-b border-border shrink-0">
              <Link href="/dashboard" onClick={() => setOpen(false)}>
                <Image src="/logo-light.png" alt="DailyReport" width={1800} height={400} quality={100} className="h-8 w-auto dark:hidden" />
                <Image src="/logo-dark.png" alt="DailyReport" width={1800} height={400} quality={100} className="h-8 w-auto hidden dark:block" />
              </Link>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <nav className="flex flex-col gap-5 p-3">
                {navGroups.map((group) => (
                  <div key={group.label} className="space-y-0.5">
                    <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
                      {group.label}
                    </p>
                    {group.items.map(({ href, label, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                          pathname === href
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <Icon className="w-5 h-5 shrink-0" />
                        {label}
                      </Link>
                    ))}
                  </div>
                ))}
              </nav>
            </ScrollArea>
            <div className="shrink-0 border-t border-border p-3 space-y-1 bg-card">
              {user && (
                <div className="flex items-center gap-3 px-2 py-2 mb-1">
                  {user.imageUrl ? (
                    <Image src={user.imageUrl} alt={user.fullName ?? "User"} width={32} height={32} className="rounded-full w-8 h-8 object-cover shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                      {(user.firstName?.[0] ?? user.primaryEmailAddress?.emailAddress?.[0] ?? "U").toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{user.fullName ?? user.primaryEmailAddress?.emailAddress}</span>
                    {user.fullName && (
                      <span className="text-xs text-muted-foreground truncate">{user.primaryEmailAddress?.emailAddress}</span>
                    )}
                  </div>
                </div>
              )}
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full",
                  pathname === "/settings"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <SlidersHorizontal className="w-5 h-5 shrink-0" />
                Settings
              </Link>
              <button
                onClick={() => {
                  setOpen(false);
                  setTimeout(() => signOut({ redirectUrl: "/" }), 200);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                Sign out
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
