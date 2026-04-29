"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Search,
  MessageSquare,
  ClipboardList,
  Target,
  Sparkles,
  Star,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports/daily", label: "Daily Report", icon: FileText },
  { href: "/reports/weekly", label: "Weekly Report", icon: ClipboardList },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/affirmations", label: "Affirmations", icon: Star },
  { href: "/insights", label: "AI Insights", icon: Sparkles },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/search", label: "Search", icon: Search },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r border-border bg-card min-h-screen">
      <div className="p-6 border-b border-border">
        <span className="text-lg font-bold tracking-tight">DailyReport</span>
      </div>
      <nav className="flex flex-col gap-1 p-3 flex-1 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-border space-y-1">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full",
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
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
