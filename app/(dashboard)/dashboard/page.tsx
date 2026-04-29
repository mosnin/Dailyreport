"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { CalendarGrid } from "@/components/dashboard/CalendarGrid";
import { InsightCard } from "@/components/dashboard/InsightCard";
import { TimezoneModal } from "@/components/dashboard/TimezoneModal";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { todayString } from "@/lib/utils";
import { Bell } from "lucide-react";

export default function DashboardPage() {
  const { convexUserId, convexUser, isLoading, isAuthenticated, createError, clerkUser } = useConvexUser();
  const { getToken } = useAuth();
  const [showTzModal, setShowTzModal] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<string>("");
  const { subscribe, subscribed } = usePushSubscription(convexUserId);

  const todayReport = useQuery(
    api.reports.getDailyReport,
    convexUserId ? { userId: convexUserId, date: todayString() } : "skip"
  );

  useEffect(() => {
    if (convexUser && !convexUser.timezone) {
      setShowTzModal(true);
    }
  }, [convexUser]);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken({ template: "convex" });
        if (!token) {
          setTokenInfo("getToken returned null/empty");
          return;
        }
        const parts = token.split(".");
        if (parts.length !== 3) {
          setTokenInfo("Token is not a valid JWT (expected 3 parts)");
          return;
        }
        const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
        setTokenInfo(JSON.stringify({ iss: payload.iss, aud: payload.aud, sub: payload.sub }, null, 2));
      } catch (e) {
        setTokenInfo("getToken error: " + (e instanceof Error ? e.message : String(e)));
      }
    })();
  }, [getToken, isAuthenticated]);

  if (isLoading || !convexUserId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Auth Debug</h1>
        <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-sm font-mono">
          <div>Clerk loaded: <span className="font-semibold">{String(!isLoading)}</span></div>
          <div>Clerk user id: <span className="font-semibold">{clerkUser?.id ?? "null"}</span></div>
          <div>Clerk email: <span className="font-semibold">{clerkUser?.primaryEmailAddress?.emailAddress ?? "null"}</span></div>
          <div>Convex authenticated: <span className="font-semibold">{String(isAuthenticated)}</span></div>
          <div>Convex user id: <span className="font-semibold">{convexUserId ?? "null"}</span></div>
          <div>Convex user (query): <span className="font-semibold">{convexUser === undefined ? "loading..." : convexUser === null ? "null (auth failed or no user yet)" : convexUser._id}</span></div>
          {createError && (
            <div className="text-red-500">getOrCreate error: {createError}</div>
          )}
          <div className="pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground mb-1">JWT (template=convex) payload preview:</div>
            <pre className="text-xs whitespace-pre-wrap break-all">{tokenInfo || "fetching..."}</pre>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          If &quot;iss&quot; in the JWT does not match the value hardcoded in <code>convex/auth.config.ts</code>, that is the problem.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        {todayReport === null && (
          <Link
            href="/reports/daily"
            className="inline-flex items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
          >
            Fill today&apos;s report
          </Link>
        )}
        {todayReport && (
          <span className="text-sm text-green-600 font-medium">✓ Daily report submitted</span>
        )}
      </div>

      <StatsBar userId={convexUserId} />

      {!subscribed && typeof window !== "undefined" && "Notification" in window && Notification.permission !== "granted" && (
        <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3">
          <div className="flex items-center gap-3 text-sm">
            <Bell className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Enable push notifications to get your 8pm daily reminders.</span>
          </div>
          <Button size="sm" variant="outline" onClick={subscribe}>
            Enable
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CalendarGrid userId={convexUserId} />
        <InsightCard userId={convexUserId} />
      </div>

      {convexUserId && (
        <TimezoneModal
          userId={convexUserId}
          open={showTzModal}
          onClose={() => setShowTzModal(false)}
        />
      )}
    </div>
  );
}
