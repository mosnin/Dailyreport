"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Menu, SlidersHorizontal, ShieldAlert, LogOut } from "lucide-react";
import { useClerk, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import { useConvexUser } from "@/hooks/useConvexUser";
import { NAV, BOTTOM_TABS } from "@/lib/nav";
import {
  ExpandableScreen,
  ExpandableScreenTrigger,
  ExpandableScreenContent,
  useExpandableScreen,
} from "@/components/ui/expandable-screen";

function tabHaptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(8); } catch { /* no-op */ }
  }
}

function MobileMenu() {
  const { collapse } = useExpandableScreen();
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { convexUserId, convexUser } = useConvexUser();
  const { reportDone, affirmDone } = useTodayStatus(convexUserId);
  const isAdmin = (convexUser as { role?: string } | null | undefined)?.role === "admin";
  const is = (href: string) => pathname === href;
  const dotFor = (s?: string) => (s === "report" ? !reportDone : s === "affirm" ? !affirmDone : false);

  return (
    <div className="flex min-h-full flex-col px-6 pt-7 pb-10 safe-top">
      <div className="flex items-center gap-2.5 mb-6">
        <span className="grid place-items-center w-9 h-9 rounded-xl bg-primary text-primary-foreground font-bold text-lg">A</span>
        <span className="font-heading text-xl font-bold tracking-tight">Ascend</span>
      </div>

      <nav className="flex-1 space-y-6">
        {NAV.map((section) => (
          <div key={section.label}>
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/60 mb-2">{section.label}</p>
            <div className="grid grid-cols-1 gap-0.5">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={collapse}
                  className={cn(
                    "flex items-center justify-between rounded-2xl px-4 py-3 text-lg font-medium transition-colors",
                    is(item.href) ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{item.label}</span>
                  {dotFor(item.status) && <span className="w-2 h-2 rounded-full bg-primary" />}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-6 space-y-1 border-t border-white/10 pt-4">
        {user && (
          <p className="px-4 pb-2 text-sm text-muted-foreground truncate">{user.fullName ?? user.primaryEmailAddress?.emailAddress}</p>
        )}
        {isAdmin && (
          <Link href="/admin" onClick={collapse} className="flex items-center rounded-2xl px-4 py-3 text-base font-medium text-rose-400 hover:bg-white/5">Admin</Link>
        )}
        <Link href="/settings" onClick={collapse} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground">
          <SlidersHorizontal className="w-4 h-4" /> Settings
        </Link>
        <button onClick={() => { collapse(); setTimeout(() => signOut({ redirectUrl: "/" }), 150); }} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium text-muted-foreground hover:text-foreground">
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}

export function BottomTabBar() {
  const pathname = usePathname();
  const { convexUserId } = useConvexUser();
  const { reportDone, affirmDone } = useTodayStatus(convexUserId);
  const is = (href: string) => pathname === href;
  const dotFor = (s?: string) => (s === "report" ? !reportDone : s === "affirm" ? !affirmDone : false);

  return (
    <ExpandableScreen layoutId="mobile-nav" triggerRadius="9999px" contentRadius="0px" animationDuration={0.35}>
      <nav
        aria-label="Primary"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/70 backdrop-blur-xl border-t border-white/10"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <ul className="flex items-stretch px-1 pt-1">
          {BOTTOM_TABS.map((tab) => {
            const active = is(tab.href);
            const Icon = tab.icon;
            return (
              <li key={tab.href} className="flex-1 flex">
                <motion.div whileTap={{ scale: 0.92 }} className="flex-1 flex">
                  <Link
                    href={tab.href}
                    onClick={tabHaptic}
                    className="relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] pt-2 pb-1"
                  >
                    {active && (
                      <motion.span layoutId="bottom-tab-indicator" className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                    )}
                    <div className="relative">
                      <Icon className={cn("w-5 h-5 transition-colors", active ? "text-primary" : "text-muted-foreground/60")} />
                      {dotFor(tab.status) && !active && (
                        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className={cn("text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground/60")}>{tab.label}</span>
                  </Link>
                </motion.div>
              </li>
            );
          })}
          <li className="flex-1 flex">
            <ExpandableScreenTrigger className="flex-1 flex">
              <div
                onClick={tabHaptic}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] pt-2 pb-1 text-muted-foreground/60"
              >
                <Menu className="w-5 h-5" />
                <span className="text-[10px] font-medium">More</span>
              </div>
            </ExpandableScreenTrigger>
          </li>
        </ul>
      </nav>

      <ExpandableScreenContent
        className="bg-background/95 backdrop-blur-2xl"
        closeButtonClassName="text-foreground bg-white/10 hover:bg-white/20"
      >
        <MobileMenu />
      </ExpandableScreenContent>
    </ExpandableScreen>
  );
}
