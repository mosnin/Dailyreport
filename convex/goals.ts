import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const CATEGORY = v.union(
  v.literal("lifelong"),
  v.literal("yearly"),
  v.literal("quarterly"),
  v.literal("monthly"),
  v.literal("weekly")
);

export const list = query({
  args: {
    userId: v.id("users"),
    category: CATEGORY,
    periodKey: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("goals")
      .withIndex("by_user_category_period", (q) =>
        q
          .eq("userId", args.userId)
          .eq("category", args.category)
          .eq("periodKey", args.periodKey)
      )
      .order("asc")
      .collect();
  },
});

export const add = mutation({
  args: {
    userId: v.id("users"),
    category: CATEGORY,
    periodKey: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("goals", {
      userId: args.userId,
      category: args.category,
      periodKey: args.periodKey,
      title: args.title,
      completed: false,
      createdAt: Date.now(),
    });
  },
});

export const toggle = mutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.goalId);
    if (!goal) return;
    await ctx.db.patch(args.goalId, { completed: !goal.completed });
  },
});

export const updateTitle = mutation({
  args: { goalId: v.id("goals"), title: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.goalId, { title: args.title });
  },
});

export const remove = mutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.goalId);
  },
});
