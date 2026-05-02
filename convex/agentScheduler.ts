"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const triggerMorningBriefing = internalAction({
  args: {
    userId: v.id("users"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const intent =
      "Morning briefing: review my recent daily reports and active goals, then write a clear prioritized briefing for today. Be concise and decisive.";

    // @ts-ignore — createJobInternal added in parallel; run npx convex dev --once
    const jobId: string = await ctx.runMutation(internal.agentJobs.createJobInternal, {
      userId: args.userId,
      intent,
    });

    const modalUrl = process.env.MODAL_AGENT_URL;
    const modalSecret = process.env.MODAL_AGENT_SECRET;

    if (!modalUrl || !modalSecret) return; // Agent not configured — skip silently

    try {
      await fetch(`${modalUrl}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${modalSecret}`,
        },
        body: JSON.stringify({
          userId: args.clerkId,
          convexUserId: args.userId,
          intent,
          jobId,
          connectedPlatforms: [], // Morning briefing uses reports + goals; platforms added as integrations are connected
        }),
      });
    } catch {
      // Don't throw — a failed Modal call shouldn't block other users in the cron
    }
  },
});
