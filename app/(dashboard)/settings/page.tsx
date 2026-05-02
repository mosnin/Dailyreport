"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useClerk } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Check, Sun, Moon, Monitor } from "lucide-react";
import { motion } from "motion/react";
import { fadeUp } from "@/lib/motion";
import Image from "next/image";

const COMMON_TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu",
  "America/Toronto", "America/Vancouver", "America/Mexico_City",
  "America/Sao_Paulo", "Europe/London", "Europe/Paris",
  "Europe/Berlin", "Europe/Moscow", "Asia/Dubai",
  "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo",
  "Asia/Seoul", "Australia/Sydney", "Pacific/Auckland",
];

// ── Section label ─────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/40 mb-3">
      {children}
    </p>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-border/40 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      <div className="shrink-0 ml-6">{children}</div>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
        on ? "bg-primary" : "bg-muted"
      )}
    >
      <motion.span
        layout
        animate={{ x: on ? 24 : 4 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="inline-block h-4 w-4 rounded-full bg-white shadow"
      />
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { convexUserId, convexUser, clerkUser, isLoading } = useConvexUser();
  const { signOut } = useClerk();
  const { subscribe, subscribed } = usePushSubscription(convexUserId);
  const updateTimezone = useMutation(api.users.updateTimezone);
  const updateEmailOptOut = useMutation(api.users.updateEmailOptOut);
  const updateProfile = useMutation(api.users.updateProfile);

  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  const { theme, setTheme } = useTheme();
  const [tz, setTz] = useState("");
  const [savingTz, setSavingTz] = useState(false);

  const emailOptOut = (convexUser as { emailOptOut?: boolean } | null | undefined)?.emailOptOut ?? false;
  const plan = (convexUser as { plan?: string } | null | undefined)?.plan ?? "free";
  const role = (convexUser as { role?: string } | null | undefined)?.role ?? "user";
  const hasPaidAccess = plan === "pro" || plan === "unlimited" || role === "admin";

  const successToastShown = useRef(false);
  useEffect(() => {
    if (successToastShown.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("subscription") === "success") {
      successToastShown.current = true;
      toast.success("Subscription activated! Welcome to Pro.");
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  useEffect(() => {
    if (convexUser?.timezone) setTz(convexUser.timezone);
    else setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York");
  }, [convexUser?.timezone]);

  useEffect(() => {
    if (convexUser) {
      setProfileName(convexUser.name ?? "");
      setProfileBio((convexUser as { bio?: string }).bio ?? "");
    }
  }, [convexUser]);

  async function handleSaveProfile() {
    if (!convexUserId || !profileName.trim()) return;
    setSavingProfile(true);
    try {
      await updateProfile({ userId: convexUserId, name: profileName.trim(), bio: profileBio.trim() || undefined });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSaveTz() {
    if (!convexUserId || !tz) return;
    setSavingTz(true);
    try {
      await updateTimezone({ userId: convexUserId, timezone: tz });
      toast.success("Timezone saved.");
    } finally {
      setSavingTz(false);
    }
  }

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-xl space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-8">

      {/* ── Page header ── */}
      <motion.div {...fadeUp(0)}>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your account and preferences.</p>
      </motion.div>

      {/* ── Identity card ── */}
      <motion.div {...fadeUp(0.06)} className="rounded-2xl bg-foreground text-background px-6 py-5 flex items-center gap-4">
        {clerkUser?.imageUrl ? (
          <Image
            src={clerkUser.imageUrl}
            alt={clerkUser.fullName ?? "You"}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-background/20 text-background flex items-center justify-center text-lg font-semibold shrink-0">
            {(clerkUser?.firstName?.[0] ?? clerkUser?.primaryEmailAddress?.emailAddress?.[0] ?? "?").toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-background leading-tight">
            {clerkUser?.fullName ?? clerkUser?.primaryEmailAddress?.emailAddress ?? "Your account"}
          </p>
          {clerkUser?.fullName && (
            <p className="text-sm text-background/60 truncate mt-0.5">
              {clerkUser.primaryEmailAddress?.emailAddress}
            </p>
          )}
        </div>
      </motion.div>

      {/* ── Notifications section ── */}
      <motion.div {...fadeUp(0.12)}>
        <SectionLabel>Notifications</SectionLabel>
        <div className="rounded-2xl border border-border bg-card px-5 py-1">
          <Row label="Push notifications" sub={subscribed ? "Active — you'll be reminded at 8pm" : "Off — enable to get daily reminders"}>
            {subscribed ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                On
              </span>
            ) : (
              <button
                onClick={subscribe}
                disabled={typeof window !== "undefined" && !("Notification" in window)}
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-40"
              >
                Enable
              </button>
            )}
          </Row>
          <Row label="Email digest" sub="Monday summary + Sunday nudge if no weekly review">
            <Toggle
              on={!emailOptOut}
              onToggle={async () => {
                if (!convexUserId) return;
                await updateEmailOptOut({ userId: convexUserId, optOut: !emailOptOut });
                toast.success(emailOptOut ? "Emails re-enabled." : "Emails turned off.");
              }}
            />
          </Row>
        </div>
      </motion.div>

      {/* ── Appearance section ── */}
      <motion.div {...fadeUp(0.18)}>
        <SectionLabel>Appearance</SectionLabel>
        <div className="rounded-2xl border border-border bg-card px-5 py-4">
          <div className="flex gap-1 p-1 rounded-xl bg-muted/60 w-fit">
            {[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark",  label: "Dark",  icon: Moon },
              { value: "system",label: "System",icon: Monitor },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  theme === value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Account section ── */}
      <motion.div {...fadeUp(0.24)}>
        <SectionLabel>Account</SectionLabel>
        <div className="rounded-2xl border border-border bg-card px-5 py-1">
          <div className="py-3.5 border-b border-border/40">
            <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-1.5">Name</p>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-transparent text-sm focus:outline-none text-foreground placeholder:text-muted-foreground/30 border-b border-border/30 focus:border-primary/50 pb-1 transition-colors"
            />
          </div>
          <div className="py-3.5 border-b border-border/40">
            <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-1.5">About you</p>
            <textarea
              value={profileBio}
              onChange={(e) => setProfileBio(e.target.value)}
              placeholder="A short bio…"
              rows={2}
              className="w-full bg-transparent text-sm focus:outline-none text-foreground placeholder:text-muted-foreground/30 resize-none border-b border-border/30 focus:border-primary/50 pb-1 transition-colors"
            />
          </div>
          <div className="flex items-center justify-between py-3.5">
            <div>
              <p className="text-[11px] font-medium text-muted-foreground/50 uppercase tracking-wider mb-0.5">Email</p>
              <p className="text-sm">{convexUser?.email || clerkUser?.primaryEmailAddress?.emailAddress || "—"}</p>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile || !profileName.trim()}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
            >
              {profileSaved ? <><Check className="w-3.5 h-3.5 text-emerald-500" /> Saved</> : savingProfile ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Timezone section ── */}
      <motion.div {...fadeUp(0.30)}>
        <SectionLabel>Timezone</SectionLabel>
        <div className="rounded-2xl border border-border bg-card px-5 py-1">
          <Row label="Your timezone" sub="Reminders are sent at 8pm in your local time">
            <div className="flex items-center gap-2">
              <select
                value={tz}
                onChange={(e) => setTz(e.target.value)}
                className="text-sm bg-transparent border-b border-border/40 focus:border-primary/50 focus:outline-none pb-0.5 text-foreground transition-colors"
              >
                {COMMON_TIMEZONES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                ))}
              </select>
              <button
                onClick={handleSaveTz}
                disabled={savingTz || !tz}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
              >
                {savingTz ? "…" : "Save"}
              </button>
            </div>
          </Row>
        </div>
      </motion.div>

      {/* ── Plan section ── */}
      <motion.div {...fadeUp(0.36)}>
        <SectionLabel>Plan</SectionLabel>
        <div className="rounded-2xl border border-border bg-card px-5 py-1">
          <Row label="Current plan" sub={hasPaidAccess ? "Full access to all features" : "Core features included"}>
            <span className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-full",
              plan === "unlimited" ? "bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300"
              : plan === "pro" ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300"
              : role === "admin" ? "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"
              : "bg-muted text-muted-foreground"
            )}>
              {role === "admin" ? "Admin" : plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
          </Row>
          {!hasPaidAccess && (
            <div className="py-3.5 border-t border-border/40">
              <p className="text-sm text-muted-foreground mb-3">
                Upgrade to Pro for <span className="font-medium text-foreground">$12.99/month</span> — AI insights, affirmations, and visualizations.
              </p>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/checkout", { method: "POST" });
                    const data = await res.json() as { checkoutUrl?: string; error?: string };
                    if (data.checkoutUrl) window.location.href = data.checkoutUrl;
                    else toast.error(data.error ?? "Failed to start checkout");
                  } catch { toast.error("Failed to start checkout"); }
                }}
                className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Upgrade to Pro →
              </button>
            </div>
          )}
          {plan === "pro" && (
            <Row label="Billing" sub="">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/billing", { method: "POST" });
                    const data = await res.json() as { portalUrl?: string; error?: string };
                    if (data.portalUrl) window.open(data.portalUrl, "_blank");
                    else toast.error(data.error ?? "Failed to open billing portal");
                  } catch { toast.error("Failed to open billing portal"); }
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Manage →
              </button>
            </Row>
          )}
        </div>
      </motion.div>

      {/* ── Sign out ── */}
      <motion.div {...fadeUp(0.42)} className="pt-4">
        <button
          onClick={() => signOut({ redirectUrl: "/" })}
          className="w-full py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors"
        >
          Sign out
        </button>
      </motion.div>

    </div>
  );
}
