"use client";

import { useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Bell, Globe, User, LogOut, Sun, Moon, Monitor, CreditCard, Crown, Zap, Mail } from "lucide-react";
import { toast } from "sonner";
import { useClerk } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Moscow",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export default function SettingsPage() {
  const { convexUserId, convexUser, clerkUser, isLoading } = useConvexUser();
  const { signOut } = useClerk();
  const { subscribe, subscribed } = usePushSubscription(convexUserId);
  const updateTimezone = useMutation(api.users.updateTimezone);
  const updateEmailOptOut = useMutation(api.users.updateEmailOptOut);
  const emailOptOut = (convexUser as { emailOptOut?: boolean } | null | undefined)?.emailOptOut ?? false;

  const { theme, setTheme } = useTheme();
  const [tz, setTz] = useState("");
  const [savingTz, setSavingTz] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  const plan = (convexUser as { plan?: string } | null | undefined)?.plan ?? "free";
  const role = (convexUser as { role?: string } | null | undefined)?.role ?? "user";
  const hasPaidAccess = plan === "pro" || plan === "unlimited" || role === "admin";

  async function handleUpgrade() {
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json() as { checkoutUrl?: string; error?: string };
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.error(data.error ?? "Failed to start checkout");
      }
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function handleManageBilling() {
    setBillingLoading(true);
    try {
      const res = await fetch("/api/billing", { method: "POST" });
      const data = await res.json() as { portalUrl?: string; error?: string };
      if (data.portalUrl) {
        window.open(data.portalUrl, "_blank");
      } else {
        toast.error(data.error ?? "Failed to open billing portal");
      }
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setBillingLoading(false);
    }
  }

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
    if (convexUser?.timezone) {
      setTz(convexUser.timezone);
    } else {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTz(detected || "America/New_York");
    }
  }, [convexUser?.timezone]);

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
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{convexUser?.name || clerkUser?.fullName || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium truncate ml-4">{convexUser?.email || clerkUser?.primaryEmailAddress?.emailAddress || "—"}</span>
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sun className="w-4 h-4 text-muted-foreground" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Choose how the app looks. System follows your device preference.
          </p>
          <div className="flex gap-2">
            {(["light", "dark", "system"] as const).map((t) => {
              const Icon = t === "light" ? Sun : t === "dark" ? Moon : Monitor;
              const label = t.charAt(0).toUpperCase() + t.slice(1);
              return (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-1.5 py-3 rounded-lg border-2 text-xs font-medium transition-all",
                    theme === t
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Timezone */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground" />
            Timezone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Daily report reminders are sent at 8pm in your local timezone.
          </p>
          <Select value={tz} onValueChange={(v) => { if (v) setTz(v); }}>
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSaveTz} disabled={savingTz || !tz} size="sm">
            {savingTz ? "Saving…" : "Save timezone"}
          </Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Enable browser push notifications to receive your daily and weekly reminders.
          </p>
          {subscribed ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Notifications enabled
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={subscribe}
              disabled={typeof window !== "undefined" && !("Notification" in window)}
            >
              Enable notifications
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Email notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="w-4 h-4 text-muted-foreground" />
            Email notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Two emails per week at most — a Monday digest summarising your previous week, and a Sunday nudge if you haven't submitted your weekly review.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {emailOptOut ? "Emails disabled" : "Emails enabled"}
            </span>
            <button
              onClick={async () => {
                if (!convexUserId) return;
                await updateEmailOptOut({ userId: convexUserId, optOut: !emailOptOut });
                toast.success(emailOptOut ? "Emails re-enabled." : "Emails turned off.");
              }}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                emailOptOut ? "bg-muted" : "bg-primary"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                  emailOptOut ? "translate-x-1" : "translate-x-6"
                )}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Current plan */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Current plan</span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
                plan === "unlimited"
                  ? "bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300"
                  : plan === "pro"
                  ? "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300"
                  : role === "admin"
                  ? "bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {plan === "unlimited" && <Crown className="w-3 h-3" />}
              {plan === "pro" && <Zap className="w-3 h-3" />}
              {role === "admin"
                ? "Admin"
                : plan.charAt(0).toUpperCase() + plan.slice(1)}
            </span>
          </div>

          {/* Actions */}
          {!hasPaidAccess && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Upgrade to Pro for <span className="font-semibold text-foreground">$12.99/month</span> — full
                access to all features including AI insights, affirmations, and visualizations.
              </p>
              <Button
                size="sm"
                onClick={handleUpgrade}
                disabled={checkoutLoading}
                className="w-full"
              >
                {checkoutLoading ? "Redirecting…" : "Upgrade to Pro →"}
              </Button>
            </div>
          )}

          {plan === "pro" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleManageBilling}
              disabled={billingLoading}
            >
              {billingLoading ? "Opening…" : "Manage subscription"}
            </Button>
          )}

          {(plan === "unlimited" || role === "admin") && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              You have unlimited access.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Sign out */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <LogOut className="w-4 h-4" />
            Sign out
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            You&apos;ll be signed out of your account and redirected to the login page.
          </p>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => signOut({ redirectUrl: "/" })}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
