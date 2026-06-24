"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { Menu, SlidersHorizontal, ShieldAlert, LogOut } from "lucide-react";
import { useClerk, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NAV, BOTTOM_TABS } from "@/lib/nav";

function tabHaptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try { navigator.vibrate(8); } catch { /* no-op */ }
  }
}

export function BottomTabBar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { convexUserId, convexUser } = useConvexUser();
  const { reportDone, affirmDone } = useTodayStatus(convexUserId);
  const isAdmin = (convexUser as { role?: string } | null | undefined)?.role === "admin";

  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const is = (href: string) => pathname === href;
  const dotFor = (s?: string) => (s === "report" ? !reportDone : s === "affirm" ? !affirmDone : false);

  return (
    <>
      <nav
        aria-label="Primary"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/85 backdrop-blur-xl border-t border-border/50"
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
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={() => { tabHaptic(); setOpen(true); }}
              className="relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] pt-2 pb-1"
            >
              <Menu className={cn("w-5 h-5", open ? "text-primary" : "text-muted-foreground/60")} />
              <span className={cn("text-[10px] font-medium", open ? "text-primary" : "text-muted-foreground/60")}>More</span>
            </motion.button>
          </li>
        </ul>
      </nav>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border shrink-0">
            <span className="grid place-items-center w-8 h-8 rounded-xl bg-primary text-primary-foreground font-bold text-lg">A</span>
            <span className="font-heading text-lg font-bold tracking-tight">Ascend</span>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <nav className="flex flex-col p-3 space-y-3">
              {NAV.map((section) => (
                <div key={section.label}>
                  <p className="px-3 pt-1 pb-1 text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground/50">{section.label}</p>
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = is(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={close}
                          className={cn("relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors", active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}
                        >
                          <Icon className={cn("w-[18px] h-[18px] shrink-0", active && "text-primary")} />
                          <span className="flex-1">{item.label}</span>
                          {dotFor(item.status) && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>
          </ScrollArea>

          <div className="shrink-0 border-t border-border p-3 space-y-1 bg-card">
            {user && (
              <div className="flex items-center gap-3 px-2 py-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                  {(user.firstName?.[0] ?? "U").toUpperCase()}
                </div>
                <span className="text-sm font-medium truncate">{user.fullName ?? user.primaryEmailAddress?.emailAddress}</span>
              </div>
            )}
            {isAdmin && (
              <Link href="/admin" onClick={close} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-500/10 w-full">
                <ShieldAlert className="w-4 h-4 shrink-0" /> Admin
              </Link>
            )}
            <Link href="/settings" onClick={close} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground w-full">
              <SlidersHorizontal className="w-4 h-4 shrink-0" /> Settings
            </Link>
            <button onClick={() => { close(); setTimeout(() => signOut({ redirectUrl: "/" }), 200); }} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground w-full">
              <LogOut className="w-4 h-4 shrink-0" /> Sign out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
