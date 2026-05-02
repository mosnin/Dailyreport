"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import {
  Gauge,
  NotepadText,
  Flame,
  Crosshair,
  Menu,
  BookOpen,
  Telescope,
  BrainCircuit,
  SlidersHorizontal,
  ShieldAlert,
  LogOut,
  Lightbulb,
  Activity,
  CalendarDays,
  Mic,
  Bot,
  Plug,
} from "lucide-react";
import { useClerk, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

// ── Drawer item (mirrors Navbar.tsx MobileNavItem) ────────────────────────

function DrawerItem({
  href,
  label,
  icon: Icon,
  active,
  onClose,
  dot,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onClose: () => void;
  dot?: boolean | null;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 leading-none">{label}</span>
      {dot === true && !active && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
      )}
      {dot === false && !active && (
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60 shrink-0" />
      )}
    </Link>
  );
}

function DrawerSection({ label }: { label: string }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground/40 select-none">
      {label}
    </p>
  );
}

// ── Bottom tab button ─────────────────────────────────────────────────────

type TabProps = {
  label: string;
  icon: React.ElementType;
  active: boolean;
  showDot?: boolean;
};

function TabIconStack({ icon: Icon, active, showDot }: Omit<TabProps, "label">) {
  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        animate={{ scale: active ? 1.05 : 1 }}
        transition={{ type: "spring", damping: 18, stiffness: 400 }}
        className="relative"
      >
        <Icon
          className={cn(
            "w-5 h-5 transition-colors",
            active ? "text-primary" : "text-muted-foreground/60"
          )}
        />
        {showDot && !active && (
          <span className="absolute -top-0.5 -right-0.5 w-1 h-1 rounded-full bg-amber-400" />
        )}
      </motion.div>
    </div>
  );
}

function tabHaptic() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(8);
    } catch {
      /* no-op */
    }
  }
}

// ── BottomTabBar ──────────────────────────────────────────────────────────

export function BottomTabBar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { convexUserId, convexUser } = useConvexUser();
  const { reportDone, affirmDone } = useTodayStatus(convexUserId);
  const isAdmin =
    (convexUser as { role?: string } | null | undefined)?.role === "admin";

  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const is = (href: string) => pathname === href;

  const tabs: {
    key: string;
    href?: string;
    label: string;
    icon: React.ElementType;
    showDot?: boolean;
  }[] = [
    { key: "today", href: "/dashboard", label: "Today", icon: Gauge },
    {
      key: "daily",
      href: "/reports/daily",
      label: "Daily",
      icon: NotepadText,
      showDot: !reportDone,
    },
    {
      key: "affirmations",
      href: "/affirmations",
      label: "Affirmations",
      icon: Flame,
      showDot: !affirmDone,
    },
    { key: "goals", href: "/goals", label: "Goals", icon: Crosshair },
    { key: "more", label: "More", icon: Menu },
  ];

  const moreActive = open;

  return (
    <>
      <nav
        aria-label="Primary"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/85 backdrop-blur-xl backdrop-saturate-150 border-t border-border/50"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <ul className="flex items-stretch px-1 pt-1">
          {/* Voice agent — center pill button */}
          <li className="flex-1 flex items-center justify-center">
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => window.dispatchEvent(new CustomEvent("open-voice-agent"))}
              className="w-11 h-11 rounded-full bg-primary/10 hover:bg-primary/15 border border-primary/20 flex items-center justify-center text-primary/70 transition-colors"
              title="Voice agent"
            >
              <Mic className="w-5 h-5" />
            </motion.button>
          </li>
          {tabs.map((tab) => {
            const isMore = tab.key === "more";
            const active = isMore ? moreActive : !!tab.href && is(tab.href);
            const content = (
              <>
                {active && (
                  <motion.span
                    layoutId="bottom-tab-indicator"
                    className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                    transition={{ type: "spring", damping: 28, stiffness: 280 }}
                  />
                )}
                <TabIconStack
                  icon={tab.icon}
                  active={active}
                  showDot={tab.showDot}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium leading-tight transition-colors",
                    active ? "text-primary" : "text-muted-foreground/60"
                  )}
                >
                  {tab.label}
                </span>
              </>
            );

            const baseClass =
              "relative flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[56px] pt-2 pb-1 select-none";

            return (
              <li key={tab.key} className="flex-1 flex">
                {isMore ? (
                  <motion.button
                    type="button"
                    onClick={() => {
                      tabHaptic();
                      setOpen(true);
                    }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: "spring", damping: 18, stiffness: 400 }}
                    className={baseClass}
                    aria-label="Open menu"
                  >
                    {content}
                  </motion.button>
                ) : (
                  <motion.div
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: "spring", damping: 18, stiffness: 400 }}
                    className="flex-1 flex"
                  >
                    <Link
                      href={tab.href!}
                      onClick={tabHaptic}
                      className={baseClass}
                      aria-current={active ? "page" : undefined}
                    >
                      {content}
                    </Link>
                  </motion.div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* More drawer — mirrors Navbar.tsx Sheet content */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <div className="flex items-center px-5 py-4 border-b border-border shrink-0">
            <Link href="/dashboard" onClick={close}>
              <Image
                src="/logo-light.png"
                alt="DailyReport"
                width={1800}
                height={400}
                quality={100}
                className="h-7 w-auto dark:hidden"
              />
              <Image
                src="/logo-dark.png"
                alt="DailyReport"
                width={1800}
                height={400}
                quality={100}
                className="h-7 w-auto hidden dark:block"
              />
            </Link>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <nav className="flex flex-col p-3">
              {/* Core */}
              <div className="space-y-0.5">
                <DrawerItem href="/dashboard" label="Today" icon={Gauge} active={is("/dashboard")} onClose={close} />
                <DrawerItem href="/reports/daily" label="Daily Report" icon={NotepadText} active={is("/reports/daily")} onClose={close} dot={reportDone} />
              </div>

              {/* Practice */}
              <DrawerSection label="Practice" />
              <div className="space-y-0.5">
                <DrawerItem href="/affirmations" label="Affirmations" icon={Flame} active={is("/affirmations")} onClose={close} dot={affirmDone} />
                <DrawerItem href="/dreams" label="Visualizations" icon={Telescope} active={is("/dreams")} onClose={close} />
                <DrawerItem href="/reports/weekly" label="Weekly Review" icon={BookOpen} active={is("/reports/weekly")} onClose={close} />
              </div>

              {/* Build */}
              <DrawerSection label="Build" />
              <div className="space-y-0.5">
                <DrawerItem href="/goals"  label="Goals"  icon={Crosshair} active={is("/goals")}  onClose={close} />
                <DrawerItem href="/agent" label="Agent" icon={Bot}       active={is("/agent")} onClose={close} />
              </div>

              {/* Connect */}
              <DrawerSection label="Connect" />
              <div className="space-y-0.5 mb-2">
                <DrawerItem href="/integrations" label="Integrations" icon={Plug} active={is("/integrations")} onClose={close} />
              </div>

              {/* Reflect */}
              <DrawerSection label="Reflect" />
              <div className="space-y-0.5 mb-2">
                <DrawerItem href="/insights" label="Progress" icon={BrainCircuit} active={is("/insights")} onClose={close} />
                <DrawerItem href="/patterns" label="Patterns" icon={Activity} active={is("/patterns")} onClose={close} />
                <DrawerItem href="/calendar" label="History" icon={CalendarDays} active={is("/calendar")} onClose={close} />
                <DrawerItem href="/inspiration" label="Inspiration" icon={Lightbulb} active={is("/inspiration")} onClose={close} />
              </div>
            </nav>
          </ScrollArea>

          <div className="shrink-0 border-t border-border p-3 space-y-1 bg-card">
            {user && (
              <div className="flex items-center gap-3 px-2 py-2 mb-1">
                {user.imageUrl ? (
                  <Image
                    src={user.imageUrl}
                    alt={user.fullName ?? "User"}
                    width={28}
                    height={28}
                    className="rounded-full w-7 h-7 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
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
            {isAdmin && (
              <Link
                href="/admin"
                onClick={close}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors w-full",
                  is("/admin")
                    ? "bg-rose-500 text-white"
                    : "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                )}
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                Admin
              </Link>
            )}
            <Link
              href="/settings"
              onClick={close}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors w-full",
                is("/settings")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <SlidersHorizontal className="w-4 h-4 shrink-0" />
              Settings
            </Link>
            <button
              onClick={() => {
                close();
                setTimeout(() => signOut({ redirectUrl: "/" }), 200);
              }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Sign out
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
