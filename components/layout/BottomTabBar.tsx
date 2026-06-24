"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Menu, Settings, LogOut, ShieldAlert } from "lucide-react";
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

const TILE_COLORS = [
  "var(--progress)",
  "var(--health)",
  "var(--goals)",
  "var(--finance)",
  "var(--emotional)",
  "var(--execution)",
  "var(--primary)",
];

/** A single iOS-style app icon. */
function AppIcon({
  href,
  label,
  icon: Icon,
  color,
  dot,
  onTap,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  dot?: boolean;
  onTap: () => void;
}) {
  return (
    <Link href={href} onClick={onTap} className="flex flex-col items-center gap-2">
      <motion.span
        whileTap={{ scale: 0.9 }}
        className="relative grid aspect-square w-full place-items-center rounded-[26%] shadow-lg shadow-black/40"
        style={{ backgroundImage: `linear-gradient(150deg, ${color}, color-mix(in oklch, ${color} 62%, black))` }}
      >
        <Icon className="h-7 w-7" style={{ color: "oklch(0.16 0.02 264)" }} />
        {dot && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />}
      </motion.span>
      <span className="w-full truncate text-center text-[11px] font-medium text-foreground/85">{label}</span>
    </Link>
  );
}

function MobileMenu() {
  const { collapse } = useExpandableScreen();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { convexUserId, convexUser } = useConvexUser();
  const { reportDone, affirmDone } = useTodayStatus(convexUserId);
  const isAdmin = (convexUser as { role?: string } | null | undefined)?.role === "admin";
  const dotFor = (s?: string) => (s === "report" ? !reportDone : s === "affirm" ? !affirmDone : false);

  let colorIdx = 0;
  const nextColor = () => TILE_COLORS[colorIdx++ % TILE_COLORS.length];

  return (
    <div
      className="flex min-h-full flex-col"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 2.5rem)",
        paddingLeft: "calc(env(safe-area-inset-left) + 1.5rem)",
        paddingRight: "calc(env(safe-area-inset-right) + 1.5rem)",
      }}
    >
      {/* Header */}
      <div className="mb-7 flex items-center justify-between">
        <Image src="/logo-dark.png" alt="Daily Report" width={1800} height={400} quality={100} className="h-6 w-auto" />
      </div>

      {/* App grid */}
      <div className="flex-1 space-y-7">
        {NAV.map((section) => (
          <div key={section.label}>
            <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/50">
              {section.label}
            </p>
            <div className="grid grid-cols-4 gap-x-4 gap-y-5">
              {section.items.map((item) => (
                <AppIcon
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  color={nextColor()}
                  dot={dotFor(item.status)}
                  onTap={collapse}
                />
              ))}
            </div>
          </div>
        ))}

        {/* System */}
        <div>
          <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/50">System</p>
          <div className="grid grid-cols-4 gap-x-4 gap-y-5">
            <AppIcon href="/settings" label="Settings" icon={Settings} color={nextColor()} onTap={collapse} />
            {isAdmin && <AppIcon href="/admin" label="Admin" icon={ShieldAlert} color="var(--emotional)" onTap={collapse} />}
            <button onClick={() => { collapse(); setTimeout(() => signOut({ redirectUrl: "/" }), 150); }} className="flex flex-col items-center gap-2">
              <motion.span whileTap={{ scale: 0.9 }} className="grid aspect-square w-full place-items-center rounded-[26%] bg-white/8 shadow-lg shadow-black/40">
                <LogOut className="h-7 w-7 text-foreground/80" />
              </motion.span>
              <span className="w-full truncate text-center text-[11px] font-medium text-foreground/85">Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {user && (
        <p className="mt-8 text-center text-xs text-muted-foreground">{user.fullName ?? user.primaryEmailAddress?.emailAddress}</p>
      )}
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
        className="bg-background/95 backdrop-blur-2xl overflow-y-auto"
        closeButtonClassName="text-foreground bg-white/10 hover:bg-white/20 !top-[calc(env(safe-area-inset-top)+0.75rem)] !right-5"
      >
        <MobileMenu />
      </ExpandableScreenContent>
    </ExpandableScreen>
  );
}
