import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const submitDaily = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    responses: v.any(),
  },
  handler: async (ctx, args) => {
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
    const user = await ctx.db.get(args.userId);
    if (!user) return { daily: {}, weekly: {} };

    const dailyReports = await ctx.db
      .query("dailyReports")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .collect();

    const weeklyReports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_user_week", (q) => q.eq("userId", args.userId))
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
    const limit = args.limit ?? 10;
    const reports = await ctx.db
      .query("dailyReports")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);
    return reports;
  },
});
