"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import {
  SlidersHorizontal,
  ShieldAlert,
  LogOut,
  Search,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { NAV } from "@/lib/nav";

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  dot,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  dot?: boolean | null;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active-bg"
          className="absolute inset-0 rounded-xl bg-accent"
          transition={{ type: "spring", damping: 30, stiffness: 320 }}
        />
      )}
      <Icon className={cn("w-[18px] h-[18px] shrink-0 relative z-10", active && "text-primary")} />
      <span className="flex-1 leading-none relative z-10">{label}</span>
      {dot === true && !active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 relative z-10" />}
      {dot === false && !active && <span className="w-1.5 h-1.5 rounded-full bg-primary relative z-10" />}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { convexUserId, convexUser } = useConvexUser();
  const { reportDone, affirmDone, totalDone, streak } = useTodayStatus(convexUserId);
  const isAdmin = (convexUser as { role?: string } | null | undefined)?.role === "admin";
  const is = (href: string) => pathname === href;

  const dotFor = (status?: string): boolean | null => {
    if (status === "report") return reportDone;
    if (status === "affirm") return affirmDone;
    return null;
  };

  return (
    <aside className="hidden lg:flex flex-col shrink-0 w-60 border-r border-sidebar-border bg-sidebar/55 backdrop-blur-xl sticky top-0 h-screen">
      {/* Wordmark */}
      <div className="flex items-center px-5 h-16 shrink-0">
        <Link href="/today" className="flex items-center">
          <Image src="/logo-dark.png" alt="Daily Report" width={1800} height={400} quality={100} className="h-7 w-auto" />
        </Link>
      </div>

      {/* Today strip */}
      <div className="mx-3 mb-2 rounded-2xl bg-accent/60 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Today</p>
          <p className="text-sm font-semibold numeral">{totalDone} done</p>
        </div>
        {streak > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-background/60 px-2 py-1">
            <Flame className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold numeral">{streak}</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-3 mb-1">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
          className="w-full flex items-center gap-2 rounded-xl border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
          <kbd className="ml-auto text-[10px] font-mono bg-muted rounded px-1 py-0.5">⌘K</kbd>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto min-h-0 px-2 py-2 space-y-3 no-scrollbar">
        {NAV.map((section) => (
          <div key={section.label}>
            <p className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground/50 select-none">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={is(item.href)}
                  dot={dotFor(item.status)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-sidebar-border p-2 space-y-1">
        {user && (
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            {user.imageUrl ? (
              <Image src={user.imageUrl} alt={user.fullName ?? "User"} width={28} height={28} className="rounded-full w-7 h-7 object-cover shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                {(user.firstName?.[0] ?? "U").toUpperCase()}
              </div>
            )}
            <span className="text-xs font-medium truncate">{user.fullName ?? user.primaryEmailAddress?.emailAddress}</span>
          </div>
        )}
        {isAdmin && (
          <Link href="/admin" className={cn("flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-colors", is("/admin") ? "bg-rose-500 text-white" : "text-rose-500 hover:bg-rose-500/10")}>
            <ShieldAlert className="w-4 h-4 shrink-0" /> Admin
          </Link>
        )}
        <Link href="/settings" className={cn("flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-colors", is("/settings") ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}>
          <SlidersHorizontal className="w-4 h-4 shrink-0" /> Settings
        </Link>
        <button onClick={() => signOut({ redirectUrl: "/" })} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <LogOut className="w-4 h-4 shrink-0" /> Sign out
        </button>
      </div>
    </aside>
  );
}
