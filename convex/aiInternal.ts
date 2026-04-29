import { internalQuery, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getDailyReportInternal = internalQuery({
  args: { reportId: v.id("dailyReports") },
  handler: async (ctx, args) => ctx.db.get(args.reportId),
});

export const getWeeklyReportInternal = internalQuery({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, args) => ctx.db.get(args.reportId),
});

export const patchDailyEmbedding = internalMutation({
  args: { reportId: v.id("dailyReports"), embedding: v.array(v.float64()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reportId, { embedding: args.embedding });
  },
});

export const patchWeeklyEmbedding = internalMutation({
  args: { reportId: v.id("weeklyReports"), embedding: v.array(v.float64()) },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reportId, { embedding: args.embedding });
  },
});

export const getWeekReportsForInsight = internalQuery({
  args: { userId: v.id("users"), weekStartDate: v.string() },
  handler: async (ctx, args) => {
    const weekStart = new Date(args.weekStartDate);
    const daily = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const report = await ctx.db
        .query("dailyReports")
        .withIndex("by_user_date", (q) =>
          q.eq("userId", args.userId).eq("date", dateStr)
        )
        .unique();
      if (report) daily.push(report);
    }
    const weekly = await ctx.db
      .query("weeklyReports")
      .withIndex("by_user_week", (q) =>
        q.eq("userId", args.userId).eq("weekStartDate", args.weekStartDate)
      )
      .unique();
    return { daily, weekly };
  },
});

export const saveInsight = internalMutation({
  args: {
    userId: v.id("users"),
    weekStartDate: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiInsights")
      .withIndex("by_user_week", (q) =>
        q.eq("userId", args.userId).eq("weekStartDate", args.weekStartDate)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { content: args.content, generatedAt: Date.now() });
    } else {
      await ctx.db.insert("aiInsights", {
        userId: args.userId,
        weekStartDate: args.weekStartDate,
        content: args.content,
        generatedAt: Date.now(),
      });
    }
  },
});

export const getLatestInsight = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return null;
    return await ctx.db
      .query("aiInsights")
      .withIndex("by_user_week", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();
  },
});

export const getRecentReportsForInsights = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const daily = await ctx.db
      .query("dailyReports")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(30);
    const weekly = await ctx.db
      .query("weeklyReports")
      .withIndex("by_user_week", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(12);
    return { daily, weekly };
  },
});
