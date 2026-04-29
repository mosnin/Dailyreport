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
      <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", on ? "translate-x-6" : "translate-x-1")} />
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
      <div className="max-w-lg space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-10">
      <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">Settings</h1>

      {/* ── Account ── */}
      <section>
        <SectionLabel>Account</SectionLabel>
        <div className="space-y-0">
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
          <div className="flex items-center justify-between py-3.5 border-b border-border/40">
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
      </section>

      {/* ── Appearance ── */}
      <section>
        <SectionLabel>Appearance</SectionLabel>
        <div className="flex gap-2">
          {(["light", "dark", "system"] as const).map((t) => {
            const Icon = t === "light" ? Sun : t === "dark" ? Moon : Monitor;
            return (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all",
                  theme === t
                    ? "border-primary/50 bg-primary/5 text-primary"
                    : "border-border/40 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Timezone ── */}
      <section>
        <SectionLabel>Reminders</SectionLabel>
        <div className="space-y-0">
          <Row label="Timezone" sub="Daily reminders sent at 8pm in your local time">
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
          <Row label="Push notifications" sub={subscribed ? "Active — you'll be reminded at 8pm" : "Off"}>
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
      </section>

      {/* ── Subscription ── */}
      <section>
        <SectionLabel>Plan</SectionLabel>
        <div className="space-y-0">
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
            <div className="py-3.5 border-b border-border/40">
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
      </section>

      {/* ── Sign out ── */}
      <section className="pb-8">
        <button
          onClick={() => signOut({ redirectUrl: "/" })}
          className="text-sm text-muted-foreground/50 hover:text-destructive transition-colors"
        >
          Sign out
        </button>
      </section>
    </div>
  );
}
