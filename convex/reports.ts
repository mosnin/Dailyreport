import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

async function assertOwner(ctx: any, userId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user || user.clerkId !== identity.subject) throw new Error("Unauthorized");
}

export const submitDaily = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    responses: v.any(),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx, args.userId);

    const existing = await ctx.db
      .query("dailyReports")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .unique();

    let reportId;
    if (existing) {
      await ctx.db.patch(existing._id, {
        responses: args.responses,
        submittedAt: Date.now(),
        embedding: undefined,
      });
      reportId = existing._id;
    } else {
      reportId = await ctx.db.insert("dailyReports", {
        userId: args.userId,
        date: args.date,
        responses: args.responses,
        submittedAt: Date.now(),
      });
    }

    await ctx.scheduler.runAfter(0, internal.ai.embedDailyReport, {
      reportId,
    });

    return reportId;
  },
});

export const submitWeekly = mutation({
  args: {
    userId: v.id("users"),
    weekStartDate: v.string(),
    responses: v.any(),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx, args.userId);

    const existing = await ctx.db
      .query("weeklyReports")
      .withIndex("by_user_week", (q) =>
        q.eq("userId", args.userId).eq("weekStartDate", args.weekStartDate)
      )
      .unique();

    let reportId;
    if (existing) {
      await ctx.db.patch(existing._id, {
        responses: args.responses,
        submittedAt: Date.now(),
        embedding: undefined,
      });
      reportId = existing._id;
    } else {
      reportId = await ctx.db.insert("weeklyReports", {
        userId: args.userId,
        weekStartDate: args.weekStartDate,
        responses: args.responses,
        submittedAt: Date.now(),
      });
    }

    await ctx.scheduler.runAfter(0, internal.ai.embedWeeklyReport, {
      reportId,
    });
    await ctx.scheduler.runAfter(0, internal.ai.generateWeeklyInsight, {
      userId: args.userId,
      weekStartDate: args.weekStartDate,
    });

    return reportId;
  },
});

export const getDailyReport = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return null;

    return await ctx.db
      .query("dailyReports")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .unique();
  },
});

export const getWeeklyReport = query({
  args: { userId: v.id("users"), weekStartDate: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return null;

    return await ctx.db
      .query("weeklyReports")
      .withIndex("by_user_week", (q) =>
        q.eq("userId", args.userId).eq("weekStartDate", args.weekStartDate)
      )
      .unique();
  },
});

export const getCalendarData = query({
  args: { userId: v.id("users"), year: v.number(), month: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { daily: {}, weekly: {} };
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return { daily: {}, weekly: {} };

    // Fetch a ±8-day window around the queried month to cover calendar padding
    // (month is 0-indexed from the client)
    const windowStart = new Date(args.year, args.month, -7);
    const windowEnd = new Date(args.year, args.month + 1, 8);
    const startStr = windowStart.toISOString().split("T")[0];
    const endStr = windowEnd.toISOString().split("T")[0];

    const dailyReports = await ctx.db
      .query("dailyReports")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).gte("date", startStr).lte("date", endStr)
      )
      .collect();

    const weeklyReports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_user_week", (q) =>
        q.eq("userId", args.userId).gte("weekStartDate", startStr).lte("weekStartDate", endStr)
      )
      .collect();

    const dailyMap: Record<string, boolean> = {};
    for (const r of dailyReports) {
      dailyMap[r.date] = true;
    }

    const weeklyMap: Record<string, boolean> = {};
    for (const r of weeklyReports) {
      weeklyMap[r.weekStartDate] = true;
    }

    return { daily: dailyMap, weekly: weeklyMap, userCreatedAt: user.createdAt };
  },
});

export const getRecentReports = query({
  args: { userId: v.id("users"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return [];

    const limit = args.limit ?? 10;
    return await ctx.db
      .query("dailyReports")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
  },
});
