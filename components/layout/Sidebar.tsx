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
  Flame,
  Telescope,
  BrainCircuit,
  SlidersHorizontal,
  ShieldAlert,
  LogOut,
  ChevronLeft,
  Lightbulb,
  Activity,
  CalendarDays,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

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
        collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
        active
          ? "text-primary font-semibold"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {active && (
        <>
          <motion.span
            layoutId="nav-active-bg"
            className="absolute inset-0 rounded-xl bg-primary/[0.08]"
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          />
          <motion.span
            layoutId="nav-active-line"
            className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary"
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          />
        </>
      )}
      <Icon className="w-4 h-4 shrink-0 relative z-10" />
      {!collapsed && <span className="flex-1 leading-none relative z-10">{label}</span>}
      {dot === true && !active && (
        <span className={cn("w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 relative z-10", collapsed && "absolute top-1.5 right-1.5")} />
      )}
      {dot === false && !active && (
        <span className={cn("w-1.5 h-1.5 rounded-full bg-amber-400/60 shrink-0 relative z-10", collapsed && "absolute top-1.5 right-1.5")} />
      )}
    </Link>
  );
}

// ── Section divider ───────────────────────────────────────────────────────

function Section({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="h-px bg-border/30 mx-2 my-2" />;
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground/40 select-none">
      {label}
    </p>
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
    try {
      if (localStorage.getItem("sidebar-collapsed") === "true") setCollapsed(true);
    } catch {}
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
  }

  const is = (href: string) => pathname === href;

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col shrink-0 border-r border-border bg-card sticky top-0 h-screen transition-all duration-300 ease-in-out",
        collapsed ? "w-[60px]" : "w-56"
      )}
    >
      {/* Logo + collapse toggle */}
      <div className={cn("flex items-center border-b border-border shrink-0 h-[57px]", collapsed ? "justify-center px-2" : "justify-between px-4")}>
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
        <motion.button
          onClick={toggleCollapsed}
          whileTap={{ scale: 0.9 }}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title={collapsed ? "Expand" : "Collapse"}
        >
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.div>
        </motion.button>
      </div>

      {/* Today progress strip */}
      {!collapsed ? (
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
      ) : streak > 0 ? (
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
      ) : null}

      {/* Quick search */}
      <div className={cn("shrink-0", collapsed ? "px-1.5 mt-3" : "px-3 mt-3")}>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          title={collapsed ? "Search (⌘K)" : undefined}
          className={cn(
            "w-full flex items-center rounded-xl text-sm transition-colors border border-border bg-background hover:bg-accent hover:border-accent text-muted-foreground hover:text-foreground",
            collapsed ? "justify-center p-2" : "gap-2 px-3 py-2"
          )}
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && (
            <>
              <span className="text-xs">Quick search</span>
              <kbd className="ml-auto text-[10px] font-mono bg-muted/60 border border-border/60 rounded px-1 py-0.5 leading-none text-muted-foreground/60">⌘K</kbd>
            </>
          )}
        </motion.button>
      </div>

      {/* Nav */}
      <nav className={cn("flex flex-col flex-1 overflow-y-auto min-h-0 py-2", collapsed ? "px-1.5" : "px-2")}>

        {/* Core */}
        <div className="space-y-0.5">
          <NavItem href="/dashboard"     label="Today"        icon={Gauge}       active={is("/dashboard")}     collapsed={collapsed} />
          <NavItem href="/reports/daily" label="Daily Report" icon={NotepadText} active={is("/reports/daily")} collapsed={collapsed} dot={reportDone} />
        </div>

        {/* Practice */}
        <Section label="Practice" collapsed={collapsed} />
        <div className="space-y-0.5">
          <NavItem href="/affirmations"    label="Affirmations"   icon={Flame}      active={is("/affirmations")}    collapsed={collapsed} dot={affirmDone} />
          <NavItem href="/dreams"          label="Visualizations"  icon={Telescope}  active={is("/dreams")}          collapsed={collapsed} dot={vizDone} />
          <NavItem href="/reports/weekly"  label="Weekly Review"  icon={BookOpen}   active={is("/reports/weekly")}  collapsed={collapsed} />
        </div>

        {/* Build */}
        <Section label="Build" collapsed={collapsed} />
        <div className="space-y-0.5">
          <NavItem href="/goals"    label="Goals"    icon={Crosshair} active={is("/goals")}    collapsed={collapsed} />
        </div>

        {/* Reflect */}
        <Section label="Reflect" collapsed={collapsed} />
        <div className="space-y-0.5">
          <NavItem href="/insights"    label="Progress"     icon={BrainCircuit} active={is("/insights")}    collapsed={collapsed} />
          <NavItem href="/patterns"    label="Patterns"     icon={Activity}     active={is("/patterns")}    collapsed={collapsed} />
          <NavItem href="/calendar"    label="History"      icon={CalendarDays} active={is("/calendar")}    collapsed={collapsed} />
          <NavItem href="/inspiration" label="Inspiration"  icon={Lightbulb}    active={is("/inspiration")} collapsed={collapsed} />
        </div>

      </nav>

      {/* Bottom — user + utilities */}
      <div className={cn("shrink-0 border-t border-border bg-card", collapsed ? "p-1.5 space-y-1" : "p-2 space-y-1")}>
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-0.5">
            {user.imageUrl ? (
              <Image src={user.imageUrl} alt={user.fullName ?? "User"} width={28} height={28} className="rounded-full w-7 h-7 object-cover shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                {(user.firstName?.[0] ?? user.primaryEmailAddress?.emailAddress?.[0] ?? "U").toUpperCase()}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium truncate">{user.fullName ?? user.primaryEmailAddress?.emailAddress}</span>
              {user.fullName && <span className="text-[11px] text-muted-foreground truncate">{user.primaryEmailAddress?.emailAddress}</span>}
            </div>
          </div>
        )}
        {collapsed && user?.imageUrl && (
          <div className="flex justify-center mb-1">
            <Image src={user.imageUrl} alt={user.fullName ?? "User"} width={28} height={28} className="rounded-full w-7 h-7 object-cover" title={user.fullName ?? ""} />
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
        <motion.button
          onClick={() => signOut({ redirectUrl: "/" })}
          title={collapsed ? "Sign out" : undefined}
          whileTap={{ scale: 0.97 }}
          className={cn(
            "w-full flex items-center rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
            collapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-2"
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && "Sign out"}
        </motion.button>
      </div>
    </aside>
  );
}
