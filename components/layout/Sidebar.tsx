"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Search,
  ClipboardList,
  Target,
  Sparkles,
  Star,
  Settings,
  LogOut,
  TriangleAlert,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navGroups = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    label: "Reports",
    items: [
      { href: "/reports/daily", label: "Daily Report", icon: FileText },
      { href: "/reports/weekly", label: "Weekly Report", icon: ClipboardList },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/goals", label: "Goals", icon: Target },
      { href: "/problems", label: "Problems", icon: TriangleAlert },
      { href: "/affirmations", label: "Affirmations", icon: Star },
      { href: "/dreams", label: "Visualizations", icon: Eye },
    ],
  },
  {
    label: "Discover",
    items: [
      { href: "/insights", label: "AI Insights", icon: Sparkles },
      { href: "/search", label: "Search", icon: Search },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-border bg-card sticky top-0 h-screen">
      <div className="flex items-center px-5 py-4 border-b border-border shrink-0">
        <Image
          src="/logo-light.png"
          alt="DailyReport"
          width={1800}
          height={400}
          quality={100}
          className="h-9 w-auto dark:hidden"
          priority
        />
        <Image
          src="/logo-dark.png"
          alt="DailyReport"
          width={1800}
          height={400}
          quality={100}
          className="h-9 w-auto hidden dark:block"
          priority
        />
      </div>

      <nav className="flex flex-col gap-5 p-3 flex-1 overflow-y-auto min-h-0">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0 transition-colors",
                      active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-border p-3 space-y-1 bg-card">
        {user && (
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            {user.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={user.fullName ?? "User"}
                width={32}
                height={32}
                className="rounded-full w-8 h-8 object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                {(user.firstName?.[0] ?? user.primaryEmailAddress?.emailAddress?.[0] ?? "U").toUpperCase()}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">
                {user.fullName ?? user.primaryEmailAddress?.emailAddress}
              </span>
              {user.fullName && (
                <span className="text-xs text-muted-foreground truncate">
                  {user.primaryEmailAddress?.emailAddress}
                </span>
              )}
            </div>
          </div>
        )}
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full",
            pathname === "/settings"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          Settings
        </Link>
        <button
          onClick={() => signOut({ redirectUrl: "/" })}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
