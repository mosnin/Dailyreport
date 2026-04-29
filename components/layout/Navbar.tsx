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
  NotepadText,
  BookOpen,
  Crosshair,
  AlertOctagon,
  Flame,
  Telescope,
  BrainCircuit,
  MessageSquare,
  ScanSearch,
  LineChart,
  CalendarDays,
  SlidersHorizontal,
  Paintbrush,
  ShieldAlert,
  LogOut,
  AlignJustify,
  ChevronRight,
  Heart,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Mobile folder group ───────────────────────────────────────────────────

function MobileFolderGroup({
  icon: Icon,
  label,
  onClose,
  children,
}: {
  icon: React.ElementType;
  label: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        <ChevronRight className={cn("w-3 h-3 transition-transform duration-200", open && "rotate-90")} />
      </button>
      {open && (
        <div className="pl-3 space-y-0.5 border-l border-border/40 ml-3">
          {children}
        </div>
      )}
    </div>
  );
}

function MobileNavItem({
  href,
  label,
  icon: Icon,
  active,
  onClose,
  dot,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClose: () => void;
  dot?: boolean | null;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 leading-none">{label}</span>
      {dot === true && !active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
      {dot === false && !active && <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 shrink-0" />}
    </Link>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────

export function Navbar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { convexUserId, convexUser } = useConvexUser();
  const { totalDone, reportDone, affirmDone, vizDone } = useTodayStatus(convexUserId);
  const isAdmin = (convexUser as { role?: string } | null | undefined)?.role === "admin";
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const is = (href: string) => pathname === href;

  return (
    <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur">
      <Link href="/dashboard" className="flex items-center">
        <Image src="/logo-light.png" alt="DailyReport" width={1800} height={400} quality={100} className="h-7 w-auto dark:hidden" />
        <Image src="/logo-dark.png" alt="DailyReport" width={1800} height={400} quality={100} className="h-7 w-auto hidden dark:block" />
      </Link>

      <div className="flex items-center gap-2">
        {convexUserId && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground">
            <span className={cn("w-1.5 h-1.5 rounded-full", reportDone ? "bg-emerald-400" : "bg-border")} />
            <span className={cn("w-1.5 h-1.5 rounded-full", affirmDone ? "bg-amber-400" : "bg-border")} />
            <span className={cn("w-1.5 h-1.5 rounded-full", vizDone ? "bg-sky-400" : "bg-border")} />
            <span className="ml-0.5">{totalDone}/3</span>
          </div>
        )}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="p-2 rounded-lg hover:bg-accent transition-colors" onClick={() => setOpen(true)}>
            <AlignJustify className="w-5 h-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col">
            <div className="flex items-center px-5 py-4 border-b border-border shrink-0">
              <Link href="/dashboard" onClick={close}>
                <Image src="/logo-light.png" alt="DailyReport" width={1800} height={400} quality={100} className="h-7 w-auto dark:hidden" />
                <Image src="/logo-dark.png" alt="DailyReport" width={1800} height={400} quality={100} className="h-7 w-auto hidden dark:block" />
              </Link>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <nav className="flex flex-col gap-1 p-3">
                {/* Primary */}
                <div className="space-y-0.5 mb-2">
                  <MobileNavItem href="/dashboard" label="Dashboard" icon={Gauge} active={is("/dashboard")} onClose={close} />
                  <MobileNavItem href="/reports/daily" label="Daily Report" icon={NotepadText} active={is("/reports/daily")} onClose={close} dot={reportDone ? true : false} />
                </div>

                {/* Practice */}
                <MobileFolderGroup icon={Flame} label="Practice" onClose={close}>
                  <MobileNavItem href="/affirmations" label="Affirmations" icon={Flame} active={is("/affirmations")} onClose={close} dot={affirmDone ? true : false} />
                  <MobileNavItem href="/dreams" label="Dreams & Vision" icon={Telescope} active={is("/dreams")} onClose={close} dot={vizDone ? true : false} />
                  <MobileNavItem href="/reports/weekly" label="Weekly Report" icon={BookOpen} active={is("/reports/weekly")} onClose={close} />
                </MobileFolderGroup>

                {/* Build */}
                <MobileFolderGroup icon={Crosshair} label="Build" onClose={close}>
                  <MobileNavItem href="/goals" label="Goals" icon={Crosshair} active={is("/goals")} onClose={close} />
                  <MobileNavItem href="/problems" label="Problems" icon={AlertOctagon} active={is("/problems")} onClose={close} />
                  <MobileNavItem href="/giving" label="Giving" icon={Heart} active={is("/giving")} onClose={close} />
                </MobileFolderGroup>

                {/* Explore */}
                <MobileFolderGroup icon={BrainCircuit} label="Explore" onClose={close}>
                  <MobileNavItem href="/insights" label="AI Insights" icon={BrainCircuit} active={is("/insights")} onClose={close} />
                  <MobileNavItem href="/inspiration" label="Inspiration" icon={Lightbulb} active={is("/inspiration")} onClose={close} />
                  <MobileNavItem href="/chat" label="Chat" icon={MessageSquare} active={is("/chat")} onClose={close} />
                  <MobileNavItem href="/analytics" label="Analytics" icon={LineChart} active={is("/analytics")} onClose={close} />
                  <MobileNavItem href="/calendar" label="Calendar" icon={CalendarDays} active={is("/calendar")} onClose={close} />
                  <MobileNavItem href="/search" label="Search" icon={ScanSearch} active={is("/search")} onClose={close} />
                </MobileFolderGroup>

                <MobileNavItem href="/customize" label="Personalize" icon={Paintbrush} active={is("/customize")} onClose={close} />
              </nav>
            </ScrollArea>

            <div className="shrink-0 border-t border-border p-3 space-y-1 bg-card">
              {user && (
                <div className="flex items-center gap-3 px-2 py-2 mb-1">
                  {user.imageUrl ? (
                    <Image src={user.imageUrl} alt={user.fullName ?? "User"} width={28} height={28} className="rounded-full w-7 h-7 object-cover shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                      {(user.firstName?.[0] ?? user.primaryEmailAddress?.emailAddress?.[0] ?? "U").toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{user.fullName ?? user.primaryEmailAddress?.emailAddress}</span>
                    {user.fullName && <span className="text-xs text-muted-foreground truncate">{user.primaryEmailAddress?.emailAddress}</span>}
                  </div>
                </div>
              )}
              {isAdmin && (
                <Link href="/admin" onClick={close} className={cn("flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors w-full", is("/admin") ? "bg-rose-500 text-white" : "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30")}>
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  Admin
                </Link>
              )}
              <Link href="/settings" onClick={close} className={cn("flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors w-full", is("/settings") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
                <SlidersHorizontal className="w-4 h-4 shrink-0" />
                Settings
              </Link>
              <button onClick={() => { close(); setTimeout(() => signOut({ redirectUrl: "/" }), 200); }} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full">
                <LogOut className="w-4 h-4 shrink-0" />
                Sign out
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
