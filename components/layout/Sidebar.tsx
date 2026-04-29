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
  ChevronLeft,
  ChevronRight,
  Heart,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image_ from "next/image";

// ── Nav item ──────────────────────────────────────────────────────────────

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  dot,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  collapsed: boolean;
  dot?: boolean | null;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center rounded-xl text-sm font-medium transition-colors",
        collapsed ? "justify-center p-2.5 mb-0.5" : "gap-3 px-3 py-2",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="flex-1 leading-none">{label}</span>}
      {dot === true && !active && (
        <span className={cn("w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0", collapsed && "absolute top-1.5 right-1.5")} />
      )}
      {dot === false && !active && (
        <span className={cn("w-1.5 h-1.5 rounded-full bg-amber-400/60 shrink-0", collapsed && "absolute top-1.5 right-1.5")} />
      )}
    </Link>
  );
}

// ── Folder group ──────────────────────────────────────────────────────────

function FolderGroup({
  icon: Icon,
  label,
  storageKey,
  collapsed,
  children,
}: {
  icon: React.ElementType;
  label: string;
  storageKey: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      setOpen(localStorage.getItem(storageKey) === "true");
    } catch {}
  }, [storageKey]);

  function toggle() {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(storageKey, String(next)); } catch {}
  }

  if (collapsed) {
    return (
      <div className="space-y-0.5">
        <div className="h-px bg-border/30 mx-1 my-1.5" />
        {children}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <button
        onClick={toggle}
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

// ── Sidebar ───────────────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { convexUserId, convexUser } = useConvexUser();
  const { reportDone, affirmDone, vizDone, totalDone, streak } = useTodayStatus(convexUserId);
  const isAdmin = (convexUser as { role?: string } | null | undefined)?.role === "admin";

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

  const is = (href: string) => pathname === href;

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col shrink-0 border-r border-border bg-card sticky top-0 h-screen transition-all duration-300 ease-in-out",
        collapsed ? "w-[60px]" : "w-60"
      )}
    >
      {/* Logo + collapse */}
      <div
        className={cn(
          "flex items-center border-b border-border shrink-0 h-[57px]",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}
      >
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center min-w-0">
            <Image src="/logo-light.png" alt="DailyReport" width={1800} height={400} quality={100} className="h-7 w-auto dark:hidden" priority />
            <Image src="/logo-dark.png" alt="DailyReport" width={1800} height={400} quality={100} className="h-7 w-auto hidden dark:block" priority />
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
            D
          </Link>
        )}
        <button
          onClick={toggleCollapsed}
          className={cn("p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0", collapsed && "mt-0")}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <ChevronLeft className={cn("w-4 h-4 transition-transform duration-300", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Today progress strip */}
      {!collapsed && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-muted/40 flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <span className={cn("w-2 h-2 rounded-full transition-colors", reportDone ? "bg-emerald-400" : "bg-border")} title="Daily report" />
            <span className={cn("w-2 h-2 rounded-full transition-colors", affirmDone ? "bg-amber-400" : "bg-border")} title="Affirmations" />
            <span className={cn("w-2 h-2 rounded-full transition-colors", vizDone ? "bg-sky-400" : "bg-border")} title="Visualizations" />
          </div>
          <span className="text-xs text-muted-foreground">{totalDone}/3 today</span>
          {streak > 0 && (
            <div className="ml-auto flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-500" />
              <span className="text-xs font-bold text-orange-500">{streak}d</span>
            </div>
          )}
        </div>
      )}
      {collapsed && streak > 0 && (
        <div className="flex justify-center mt-3 shrink-0">
          <div className="relative" title={`${streak} day streak`}>
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <span className="absolute -top-1 -right-1 text-[9px] font-bold text-orange-500 bg-card border border-orange-400/40 rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {streak > 9 ? "9+" : streak}
            </span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className={cn("flex flex-col flex-1 overflow-y-auto min-h-0 py-3", collapsed ? "px-1.5 gap-0" : "px-2 gap-0")}>

        {/* Primary items */}
        <div className={cn("space-y-0.5", !collapsed && "mb-2")}>
          <NavItem href="/dashboard" label="Dashboard" icon={Gauge} active={is("/dashboard")} collapsed={collapsed} />
          <NavItem href="/reports/daily" label="Daily Report" icon={NotepadText} active={is("/reports/daily")} collapsed={collapsed} dot={reportDone ? true : false} />
        </div>

        {/* Practice folder */}
        <FolderGroup icon={Flame} label="Practice" storageKey="folder-practice" collapsed={collapsed}>
          <NavItem href="/affirmations" label="Affirmations" icon={Flame} active={is("/affirmations")} collapsed={collapsed} dot={affirmDone ? true : false} />
          <NavItem href="/dreams" label="Dreams & Vision" icon={Telescope} active={is("/dreams")} collapsed={collapsed} dot={vizDone ? true : false} />
          <NavItem href="/reports/weekly" label="Weekly Report" icon={BookOpen} active={is("/reports/weekly")} collapsed={collapsed} />
        </FolderGroup>

        {/* Build folder */}
        <FolderGroup icon={Crosshair} label="Build" storageKey="folder-build" collapsed={collapsed}>
          <NavItem href="/goals" label="Goals" icon={Crosshair} active={is("/goals")} collapsed={collapsed} />
          <NavItem href="/problems" label="Problems" icon={AlertOctagon} active={is("/problems")} collapsed={collapsed} />
          <NavItem href="/giving" label="Giving" icon={Heart} active={is("/giving")} collapsed={collapsed} />
        </FolderGroup>

        {/* Explore folder */}
        <FolderGroup icon={BrainCircuit} label="Explore" storageKey="folder-explore" collapsed={collapsed}>
          <NavItem href="/insights" label="AI Insights" icon={BrainCircuit} active={is("/insights")} collapsed={collapsed} />
          <NavItem href="/inspiration" label="Inspiration" icon={Lightbulb} active={is("/inspiration")} collapsed={collapsed} />
          <NavItem href="/chat" label="Chat" icon={MessageSquare} active={is("/chat")} collapsed={collapsed} />
          <NavItem href="/analytics" label="Analytics" icon={LineChart} active={is("/analytics")} collapsed={collapsed} />
          <NavItem href="/calendar" label="Calendar" icon={CalendarDays} active={is("/calendar")} collapsed={collapsed} />
          <NavItem href="/search" label="Search" icon={ScanSearch} active={is("/search")} collapsed={collapsed} />
        </FolderGroup>

        {/* Personalize — standalone small item */}
        {!collapsed ? (
          <div className="mt-1">
            <NavItem href="/customize" label="Personalize" icon={Paintbrush} active={is("/customize")} collapsed={collapsed} />
          </div>
        ) : (
          <NavItem href="/customize" label="Personalize" icon={Paintbrush} active={is("/customize")} collapsed={collapsed} />
        )}
      </nav>

      {/* Bottom */}
      <div className={cn("shrink-0 border-t border-border bg-card", collapsed ? "p-1.5 space-y-1" : "p-2 space-y-1")}>
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-0.5">
            {user.imageUrl ? (
              <Image_ src={user.imageUrl} alt={user.fullName ?? "User"} width={28} height={28} className="rounded-full w-7 h-7 object-cover shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                {(user.firstName?.[0] ?? user.primaryEmailAddress?.emailAddress?.[0] ?? "U").toUpperCase()}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate">{user.fullName ?? user.primaryEmailAddress?.emailAddress}</span>
              {user.fullName && (
                <span className="text-[11px] text-muted-foreground truncate">{user.primaryEmailAddress?.emailAddress}</span>
              )}
            </div>
          </div>
        )}
        {collapsed && user?.imageUrl && (
          <div className="flex justify-center mb-1">
            <Image_ src={user.imageUrl} alt={user.fullName ?? "User"} width={28} height={28} className="rounded-full w-7 h-7 object-cover" title={user.fullName ?? ""} />
          </div>
        )}

        {isAdmin && (
          <Link
            href="/admin"
            title={collapsed ? "Admin" : undefined}
            className={cn(
              "flex items-center rounded-xl text-sm font-medium transition-colors",
              collapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-2",
              is("/admin") ? "bg-rose-500 text-white" : "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
            )}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            {!collapsed && "Admin"}
          </Link>
        )}
        <Link
          href="/settings"
          title={collapsed ? "Settings" : undefined}
          className={cn(
            "flex items-center rounded-xl text-sm font-medium transition-colors",
            collapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-2",
            is("/settings") ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <SlidersHorizontal className="w-4 h-4 shrink-0" />
          {!collapsed && "Settings"}
        </Link>
        <button
          onClick={() => signOut({ redirectUrl: "/" })}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "w-full flex items-center rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
            collapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-2"
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && "Sign out"}
        </button>
      </div>
    </aside>
  );
}
