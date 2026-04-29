import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

type GoalCategory = "lifelong" | "yearly" | "quarterly" | "monthly" | "weekly";

function periodKeyFor(category: GoalCategory): string {
  const now = new Date();
  switch (category) {
    case "lifelong":
      return "all";
    case "yearly":
      return String(now.getFullYear());
    case "quarterly": {
      const q = Math.ceil((now.getMonth() + 1) / 3);
      return `${now.getFullYear()}-Q${q}`;
    }
    case "monthly": {
      const m = String(now.getMonth() + 1).padStart(2, "0");
      return `${now.getFullYear()}-${m}`;
    }
    case "weekly": {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${y}-${mo}-${dd}`;
    }
  }
}

const CATEGORY = v.union(
  v.literal("lifelong"),
  v.literal("yearly"),
  v.literal("quarterly"),
  v.literal("monthly"),
  v.literal("weekly")
);

async function assertOwner(ctx: any, userId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user || user.clerkId !== identity.subject) throw new Error("Unauthorized");
}

export const getCurrentSummary = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return null;

    const categories: GoalCategory[] = ["lifelong", "yearly", "quarterly", "monthly", "weekly"];
    const result: Record<string, { total: number; completed: number; periodKey: string }> = {};

    for (const category of categories) {
      const pk = periodKeyFor(category);
      const goals = await ctx.db
        .query("goals")
        .withIndex("by_user_category_period", (q) =>
          q.eq("userId", args.userId).eq("category", category).eq("periodKey", pk)
        )
        .collect();
      result[category] = {
        total: goals.length,
        completed: goals.filter((g) => g.completed).length,
        periodKey: pk,
      };
    }

    return result;
  },
});

export const list = query({
  args: {
    userId: v.id("users"),
    category: CATEGORY,
    periodKey: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return [];

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
    await assertOwner(ctx, args.userId);
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
    await assertOwner(ctx, goal.userId);
    await ctx.db.patch(args.goalId, { completed: !goal.completed });
  },
});

export const updateTitle = mutation({
  args: { goalId: v.id("goals"), title: v.string() },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.goalId);
    if (!goal) return;
    await assertOwner(ctx, goal.userId);
    await ctx.db.patch(args.goalId, { title: args.title });
  },
});

export const remove = mutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => {
    const goal = await ctx.db.get(args.goalId);
    if (!goal) return;
    await assertOwner(ctx, goal.userId);
    await ctx.db.delete(args.goalId);
  },
});
