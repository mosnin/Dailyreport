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
    // Fetch user context — name, timezone needed for personalized system prompt
    // @ts-ignore — getUserForScheduler added in parallel; run npx convex dev --once
    const user = await ctx.runQuery((internal as any).users.getUserForScheduler, {
      userId: args.userId,
    });

    // Fetch which platforms the user has connected so the briefing includes calendar/tasks
    // @ts-ignore — getConnectedPlatformsInternal added in parallel; run npx convex dev --once
    const connectedPlatforms: string[] = await ctx.runQuery(
      (internal as any).integrations.getConnectedPlatformsInternal,
      { userId: args.userId }
    );

    const userName = user?.name ?? "";
    const userTimezone = user?.timezone ?? "UTC";

    // Build today's date string in the user's local timezone
    const today = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: userTimezone,
    }).format(new Date());

    const intent = `Morning briefing for ${userName || "the user"} on ${today}: Review their recent daily reports and active goals${connectedPlatforms.length > 0 ? `, then check their connected platforms (${connectedPlatforms.join(", ")})` : ""}. Synthesize a sharp, specific briefing covering today's top priorities. Be concise and decisive.`;

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
          connectedPlatforms,
          userName,
          userTimezone,
          today,
        }),
      });
      if (!response.ok) {
        console.error(`Modal /run returned ${response.status} for job ${jobId}`);
        await ctx.runMutation(
          // @ts-ignore
          (internal as any).agentJobs.failJobInternal,
          { jobId, userId: args.userId, error: `Modal returned HTTP ${response.status}` }
        );
      }
    } catch (err) {
      console.error(`Modal fetch failed for job ${jobId}:`, err);
      await ctx.runMutation(
        // @ts-ignore
        (internal as any).agentJobs.failJobInternal,
        { jobId, userId: args.userId, error: "Agent service unreachable" }
      ).catch(() => {});
    }
  },
});
