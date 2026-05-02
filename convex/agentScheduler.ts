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
      const response = await fetch(`${modalUrl}/run`, {
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
      if (!response.ok) {
        console.error(`Modal /run returned ${response.status} for job ${jobId}`);
        await ctx.runMutation(
          // @ts-ignore — failJobInternal added in parallel; run npx convex dev --once
          (internal as any).agentJobs.failJobInternal,
          { jobId, userId: args.userId, error: `Modal returned HTTP ${response.status}` }
        );
      }
    } catch (err) {
      // Network failure — mark the job failed so the UI doesn't poll forever
      console.error(`Modal fetch failed for job ${jobId}:`, err);
      await ctx.runMutation(
        // @ts-ignore
        (internal as any).agentJobs.failJobInternal,
        { jobId, userId: args.userId, error: "Agent service unreachable" }
      ).catch(() => {}); // runMutation failure is non-fatal for the cron
    }
  },
});
