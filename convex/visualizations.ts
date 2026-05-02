import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getForDate = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return null;
    return ctx.db
      .query("visualizations")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .unique();
  },
});

export const markCompleted = mutation({
  args: { vizId: v.id("visualizations"), index: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const viz = await ctx.db.get(args.vizId);
    if (!viz) return;
    const user = await ctx.db.get(viz.userId);
    if (!user || user.clerkId !== identity.subject) throw new Error("Unauthorized");
    if (!viz.completedIndexes.includes(args.index)) {
      await ctx.db.patch(args.vizId, {
        completedIndexes: [...viz.completedIndexes, args.index],
      });
    }
  },
});
