"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, FileText, Calendar, Search, MessageSquare, ClipboardList, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports/daily", label: "Daily Report", icon: FileText },
  { href: "/reports/weekly", label: "Weekly Report", icon: ClipboardList },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/search", label: "Search", icon: Search },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur">
      <span className="text-base font-bold">DailyReport</span>
      <Sheet>
        <SheetTrigger className="p-2 rounded-lg hover:bg-accent transition-colors">
          <Menu className="w-5 h-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="p-6 border-b border-border">
            <span className="text-lg font-bold tracking-tight">DailyReport</span>
          </div>
          <nav className="flex flex-col gap-1 p-3">
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
            <a
              href="/auth/logout"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors mt-4 border-t border-border pt-4"
            >
              Sign out
            </a>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
}
