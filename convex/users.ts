import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getOrCreate = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      createdAt: Date.now(),
    });
  },
});

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const updateTimezone = mutation({
  args: { userId: v.id("users"), timezone: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { timezone: args.timezone });
  },
});

export const getStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const now = Date.now();
    const createdAt = user.createdAt;
    const dayMs = 86400000;

    const daysSinceSignup = Math.floor((now - createdAt) / dayMs);
    const weeksSinceSignup = Math.floor(daysSinceSignup / 7);

    const dailyReports = await ctx.db
      .query("dailyReports")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .collect();

    const weeklyReports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_user_week", (q) => q.eq("userId", args.userId))
      .collect();

    const dailyAccuracy =
      daysSinceSignup > 0
        ? Math.round((dailyReports.length / daysSinceSignup) * 100)
        : 100;

    const weeklyAccuracy =
      weeksSinceSignup > 0
        ? Math.round((weeklyReports.length / weeksSinceSignup) * 100)
        : 100;

    const submittedDates = new Set(dailyReports.map((r) => r.date));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i <= 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      if (submittedDates.has(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      dailyAccuracy: Math.min(dailyAccuracy, 100),
      weeklyAccuracy: Math.min(weeklyAccuracy, 100),
      streak,
      totalDailyReports: dailyReports.length,
      totalWeeklyReports: weeklyReports.length,
    };
  },
});
