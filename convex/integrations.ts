import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const PLATFORM = v.union(
  v.literal("slack"),
  v.literal("notion"),
  v.literal("clickup"),
  v.literal("trello"),
  v.literal("asana"),
  v.literal("googlecalendar")
);

export const saveIntegration = mutation({
  args: {
    userId: v.id("users"),
    platform: PLATFORM,
    composioConnectionId: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", args.userId).eq("platform", args.platform)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        composioConnectionId: args.composioConnectionId,
        connected: true,
        connectedAt: Date.now(),
        metadata: args.metadata,
      });
      return existing._id;
    } else {
      return ctx.db.insert("integrations", {
        userId: args.userId,
        platform: args.platform,
        composioConnectionId: args.composioConnectionId,
        connected: true,
        connectedAt: Date.now(),
        metadata: args.metadata,
      });
    }
  },
});

export const removeIntegration = mutation({
  args: {
    userId: v.id("users"),
    platform: PLATFORM,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const existing = await ctx.db
      .query("integrations")
      .withIndex("by_user_platform", (q) =>
        q.eq("userId", args.userId).eq("platform", args.platform)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const getUserIntegrations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("integrations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

// Called by server-side actions (e.g. cron scheduler) — no auth context
export const getConnectedPlatformsInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("integrations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return rows.filter((r) => r.connected).map((r) => r.platform);
  },
});
