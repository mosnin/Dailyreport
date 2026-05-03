"use client";

import { Suspense, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { fadeUp } from "@/lib/motion";
import { useSearchParams, useRouter } from "next/navigation";
import { Info } from "lucide-react";

const PLATFORMS = [
  { id: "googlecalendar", name: "Google Calendar", description: "See today's events, create meetings, and block focus time.", color: "bg-[#1A73E8]" },
  { id: "slack",          name: "Slack",           description: "Read messages, reply, and take action.",                     color: "bg-[#4A154B]" },
  { id: "notion",         name: "Notion",          description: "Sync pages, databases, and tasks.",                          color: "bg-gray-800" },
  { id: "asana",          name: "Asana",           description: "Pull tasks and update project status.",                      color: "bg-[#FC636B]" },
  { id: "clickup",        name: "ClickUp",         description: "Sync tasks, lists, and priorities.",                         color: "bg-[#7B68EE]" },
  { id: "trello",         name: "Trello",          description: "Manage boards, cards, and deadlines.",                       color: "bg-[#0052CC]" },
] as const;

function getConnectionIdFromParams(searchParams: ReturnType<typeof useSearchParams>): string | null {
  return (
    searchParams.get("connectionId") ??
    searchParams.get("connectedAccountId") ??
    searchParams.get("connected_account_id") ??
    searchParams.get("connection_id") ??
    searchParams.get("id")
  );
}

function IntegrationsContent() {
  const { convexUserId, isLoading } = useConvexUser();
  const searchParams = useSearchParams();
  const router = useRouter();

  // @ts-ignore
  const saveIntegration = useMutation(api.integrations.saveIntegration as any);
  // @ts-ignore
  const removeIntegration = useMutation(api.integrations.removeIntegration as any);

  // @ts-ignore
  const integrations = useQuery(
    api.integrations.getUserIntegrations as any,
    convexUserId ? { userId: convexUserId } : "skip"
  ) ?? [];

  const connectedPlatforms = new Set((integrations as any[]).map((i: any) => i.platform));

  // Handle OAuth redirect with connectionId + platform params
  useEffect(() => {
    const connectionId = getConnectionIdFromParams(searchParams);
    const platform = searchParams.get("platform")?.toLowerCase();
    if (connectionId && platform && convexUserId) {
      saveIntegration({
        userId: convexUserId,
        platform: platform as any,
        metadata: { oauthCallback: Object.fromEntries(searchParams.entries()) },
        composioConnectionId: connectionId,
      }).then(() => router.replace("/integrations"));
    }
  }, [searchParams, convexUserId, saveIntegration, router]);

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-14 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <motion.div {...fadeUp(0)}>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Connect your tools. Your agent will do the rest.
        </p>
      </motion.div>

      {/* Info note */}
      <motion.div {...fadeUp(1)}>
        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            OAuth connections are handled securely by Composio. After connecting, your agent can read and act on your tasks in real time — no credentials stored here.
          </p>
        </div>
      </motion.div>

      {/* Platform grid */}
      <motion.div {...fadeUp(2)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLATFORMS.map((platform) => {
          const connected = connectedPlatforms.has(platform.id);
          return (
            <div
              key={platform.id}
              className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-4"
            >
              {/* Top row: icon + name */}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl text-white font-bold flex items-center justify-center text-lg shrink-0",
                    platform.color
                  )}
                >
                  {platform.name[0]}
                </div>
                <span className="text-base font-semibold">{platform.name}</span>
              </div>

              {/* Description */}
              <p className="text-sm text-muted-foreground flex-1">{platform.description}</p>

              {/* Action */}
              {connected ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-sm font-medium text-emerald-600">Connected</span>
                  </div>
                  <button
                    onClick={() =>
                      // @ts-ignore
                      removeIntegration({ userId: convexUserId, platform: platform.id })
                    }
                    className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <a
                  href={`/api/integrations/connect?platform=${platform.id}&mode=redirect`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-xl bg-primary text-primary-foreground text-sm font-semibold py-2 hover:opacity-90 transition-opacity text-center"
                >
                  Connect
                </a>
              )}
            </div>
          );
        })}
      </motion.div>

    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl space-y-4">
          <Skeleton className="h-8 w-44" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-44 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  );
}
