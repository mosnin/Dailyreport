import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("affirmations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("asc")
      .collect();
  },
});

export const add = mutation({
  args: {
    userId: v.id("users"),
    text: v.string(),
    source: v.union(v.literal("manual"), v.literal("ai")),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("affirmations", {
      userId: args.userId,
      text: args.text,
      source: args.source,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("affirmations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const updateText = mutation({
  args: { id: v.id("affirmations"), text: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { text: args.text });
  },
});
