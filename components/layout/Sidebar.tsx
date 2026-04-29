"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import { useState, useEffect } from "react";
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
  LineChart,
  SlidersHorizontal,
  Paintbrush,
  LogOut,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PracticeKey = "report" | "affirm" | "viz";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Gauge, practice: null as PracticeKey | null },
      { href: "/calendar", label: "Calendar", icon: CalendarDays, practice: null as PracticeKey | null },
    ],
  },
  {
    label: "Reports",
    items: [
      { href: "/reports/daily", label: "Daily Report", icon: NotepadText, practice: "report" as PracticeKey },
      { href: "/reports/weekly", label: "Weekly Report", icon: BookOpen, practice: null as PracticeKey | null },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/goals", label: "Goals", icon: Crosshair, practice: null as PracticeKey | null },
      { href: "/problems", label: "Problems", icon: AlertOctagon, practice: null as PracticeKey | null },
      { href: "/affirmations", label: "Affirmations", icon: Flame, practice: "affirm" as PracticeKey },
      { href: "/dreams", label: "Dreams", icon: Telescope, practice: "viz" as PracticeKey },
      { href: "/customize", label: "Personalize", icon: Paintbrush, practice: null as PracticeKey | null },
    ],
  },
  {
    label: "Discover",
    items: [
      { href: "/insights", label: "AI Insights", icon: BrainCircuit, practice: null as PracticeKey | null },
      { href: "/analytics", label: "Analytics", icon: LineChart, practice: null as PracticeKey | null },
      { href: "/search", label: "Search", icon: ScanSearch, practice: null as PracticeKey | null },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { convexUserId } = useConvexUser();
  const { reportDone, affirmDone, vizDone, totalDone, streak } = useTodayStatus(convexUserId);

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  }

  function getDot(practice: PracticeKey | null): boolean | null {
    if (practice === "report") return reportDone;
    if (practice === "affirm") return affirmDone;
    if (practice === "viz") return vizDone;
    return null;
  }

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col shrink-0 border-r border-border bg-card sticky top-0 h-screen transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Logo + collapse toggle */}
      <div
        className={cn(
          "flex items-center border-b border-border shrink-0 h-[60px]",
          collapsed ? "justify-center gap-0 px-2" : "justify-between px-4"
        )}
      >
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center min-w-0">
            <Image src="/logo-light.png" alt="DailyReport" width={1800} height={400} quality={100} className="h-8 w-auto dark:hidden" priority />
            <Image src="/logo-dark.png" alt="DailyReport" width={1800} height={400} quality={100} className="h-8 w-auto hidden dark:block" priority />
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold text-sm flex items-center justify-center mr-1">
            D
          </Link>
        )}
        <button
          onClick={toggleCollapsed}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform duration-300", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Streak + today progress strip (expanded) */}
      {!collapsed && (
        <div className="mx-3 mt-3 px-3 py-2.5 rounded-xl bg-muted/50 flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className={cn("w-2.5 h-2.5 rounded-full transition-colors", reportDone ? "bg-emerald-400" : "bg-border")} title="Daily report" />
            <span className={cn("w-2.5 h-2.5 rounded-full transition-colors", affirmDone ? "bg-amber-400" : "bg-border")} title="Affirmations" />
            <span className={cn("w-2.5 h-2.5 rounded-full transition-colors", vizDone ? "bg-sky-400" : "bg-border")} title="Visualizations" />
          </div>
          <span className="text-xs text-muted-foreground">{totalDone}/3 today</span>
          {streak > 0 && (
            <div className="ml-auto flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-xs font-bold text-orange-500">{streak}d</span>
            </div>
          )}
        </div>
      )}

      {/* Streak icon (collapsed) */}
      {collapsed && streak > 0 && (
        <div className="flex justify-center mt-3 shrink-0">
          <div className="relative" title={`${streak} day streak`}>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <span className="absolute -top-1 -right-1 text-[9px] font-bold text-orange-500 bg-card border border-orange-400/40 rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {streak > 9 ? "9+" : streak}
            </span>
          </div>
        </div>
      )}

      {/* Nav groups */}
      <nav className={cn("flex flex-col flex-1 overflow-y-auto min-h-0", collapsed ? "p-2 mt-2 gap-0" : "p-3 mt-2 gap-5")}>
        {navGroups.map((group) => (
          <div key={group.label} className={cn(!collapsed && "space-y-0.5")}>
            {!collapsed && (
              <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
                {group.label}
              </p>
            )}
            {collapsed && <div className="h-px bg-border/40 mx-1 my-2" />}
            {group.items.map(({ href, label, icon: Icon, practice }) => {
              const active = pathname === href;
              const done = getDot(practice);

              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  className={cn(
                    "group relative flex items-center rounded-xl text-sm font-medium transition-colors",
                    collapsed ? "justify-center p-2.5 mb-0.5" : "gap-3 px-3 py-2.5",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span className="flex-1 leading-none">{label}</span>}
                  {done === true && !active && (
                    <span className={cn("w-2 h-2 rounded-full bg-emerald-400 shrink-0", collapsed && "absolute top-1 right-1")} />
                  )}
                  {done === false && !active && (
                    <span className={cn("w-2 h-2 rounded-full bg-amber-400/60 shrink-0", collapsed && "absolute top-1 right-1")} />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom: user + settings + sign out */}
      <div className={cn("shrink-0 border-t border-border bg-card", collapsed ? "p-2 space-y-1" : "p-3 space-y-1")}>
        {!collapsed && user && (
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
        {collapsed && user?.imageUrl && (
          <div className="flex justify-center mb-1">
            <Image src={user.imageUrl} alt={user.fullName ?? "User"} width={32} height={32} className="rounded-full w-8 h-8 object-cover" title={user.fullName ?? ""} />
          </div>
        )}

        <Link
          href="/settings"
          title={collapsed ? "Settings" : undefined}
          className={cn(
            "flex items-center rounded-xl text-sm font-medium transition-colors",
            collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
            pathname === "/settings"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <SlidersHorizontal className="w-5 h-5 shrink-0" />
          {!collapsed && "Settings"}
        </Link>
        <button
          onClick={() => signOut({ redirectUrl: "/" })}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "w-full flex items-center rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
            collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5"
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </aside>
  );
}
