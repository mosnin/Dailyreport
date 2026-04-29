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

const scoresShape = v.object({
  momentum: v.number(),
  execution: v.number(),
  wellbeing: v.number(),
  growth: v.number(),
});

export const saveInsight = internalMutation({
  args: {
    userId: v.id("users"),
    weekStartDate: v.string(),
    content: v.string(),
    scores: v.optional(scoresShape),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiInsights")
      .withIndex("by_user_week", (q) =>
        q.eq("userId", args.userId).eq("weekStartDate", args.weekStartDate)
      )
      .unique();
    const patch = {
      content: args.content,
      generatedAt: Date.now(),
      ...(args.scores ? { scores: args.scores } : {}),
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("aiInsights", {
        userId: args.userId,
        weekStartDate: args.weekStartDate,
        ...patch,
      });
    }
  },
});

export const saveProgressScores = internalMutation({
  args: {
    userId: v.id("users"),
    weekStartDate: v.string(),
    scores: scoresShape,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("aiInsights")
      .withIndex("by_user_week", (q) =>
        q.eq("userId", args.userId).eq("weekStartDate", args.weekStartDate)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { scores: args.scores });
    } else {
      await ctx.db.insert("aiInsights", {
        userId: args.userId,
        weekStartDate: args.weekStartDate,
        content: "",
        scores: args.scores,
        generatedAt: Date.now(),
      });
    }
  },
});

export const getProgressHistoryInternal = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const insights = await ctx.db
      .query("aiInsights")
      .withIndex("by_user_week", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(4);
    return insights.reverse();
  },
});

export const getProgressHistory = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return null;
    const insights = await ctx.db
      .query("aiInsights")
      .withIndex("by_user_week", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(12);
    return insights.reverse();
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

export const getUserStyles = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return {
      affirmationStyle: user?.affirmationStyle ?? "grateful",
      affirmationCustomInstructions: user?.affirmationCustomInstructions ?? null,
      visualizationStyle: user?.visualizationStyle ?? "cinematic",
      visualizationCustomInstructions: user?.visualizationCustomInstructions ?? null,
    };
  },
});

export const getGoalsForVisualization = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    // Monday of current week
    const d = new Date(now);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    const week = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

    const [allDreams, yearly, monthly, weekly] = await Promise.all([
      ctx.db.query("dreams").withIndex("by_user_category", (q) =>
        q.eq("userId", args.userId)
      ).collect(),
      ctx.db.query("goals").withIndex("by_user_category_period", (q) =>
        q.eq("userId", args.userId).eq("category", "yearly").eq("periodKey", year)
      ).collect(),
      ctx.db.query("goals").withIndex("by_user_category_period", (q) =>
        q.eq("userId", args.userId).eq("category", "monthly").eq("periodKey", month)
      ).collect(),
      ctx.db.query("goals").withIndex("by_user_category_period", (q) =>
        q.eq("userId", args.userId).eq("category", "weekly").eq("periodKey", week)
      ).collect(),
    ]);
    const dreamsByCategory: Record<string, string[]> = {
      financial: [],
      health: [],
      relationships: [],
      other: [],
    };
    for (const d of allDreams) {
      dreamsByCategory[d.category]?.push(d.title);
    }
    return {
      dreams: dreamsByCategory,
      yearly: yearly.filter((g) => !g.completed).map((g) => g.title),
      monthly: monthly.filter((g) => !g.completed).map((g) => g.title),
      weekly: weekly.filter((g) => !g.completed).map((g) => g.title),
    };
  },
});

export const getAllDreams = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const dreams = await ctx.db
      .query("dreams")
      .withIndex("by_user_category", (q) => q.eq("userId", args.userId))
      .collect();
    const byCategory: Record<string, string[]> = {
      financial: [],
      health: [],
      relationships: [],
      other: [],
    };
    for (const d of dreams) {
      byCategory[d.category]?.push(d.title);
    }
    return byCategory;
  },
});

export const getProblemsForVisualization = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const [reports, statuses] = await Promise.all([
      ctx.db
        .query("dailyReports")
        .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
        .order("desc")
        .take(7),
      ctx.db
        .query("problemStatuses")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
    ]);
    const solvedTitles = new Set(
      statuses
        .filter((s) => s.solvedManually || s.aiResolved)
        .map((s) => s.problemTitle.trim().toLowerCase())
    );
    const seen = new Set<string>();
    const problems: string[] = [];
    for (const report of reports) {
      const responses = report.responses as Record<string, unknown>;
      if (Array.isArray(responses?.problemsToSolve)) {
        for (const p of responses.problemsToSolve as Array<{ title?: string }>) {
          const key = p.title?.trim().toLowerCase();
          if (key && !seen.has(key) && !solvedTitles.has(key)) {
            seen.add(key);
            problems.push(p.title!.trim());
          }
        }
      }
    }
    return problems.slice(0, 5);
  },
});

export const getVisualizationForDate = internalQuery({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("visualizations")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .unique();
  },
});

export const saveVisualizationScenarios = internalMutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    scenarios: v.array(v.object({ title: v.string(), description: v.string() })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("visualizations")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        scenarios: args.scenarios,
        completedIndexes: [],
        generatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("visualizations", {
        userId: args.userId,
        date: args.date,
        scenarios: args.scenarios,
        completedIndexes: [],
        generatedAt: Date.now(),
      });
    }
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

export const getDailyBriefInternal = internalQuery({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("dailyBriefs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .unique(),
});

export const saveDailyBrief = internalMutation({
  args: { userId: v.id("users"), date: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dailyBriefs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { content: args.content });
    } else {
      await ctx.db.insert("dailyBriefs", {
        userId: args.userId,
        date: args.date,
        content: args.content,
      });
    }
  },
});

export const getDailyBriefPublic = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return null;
    return ctx.db
      .query("dailyBriefs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .unique();
  },
});

export const getInspirationForDate = internalQuery({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) =>
    ctx.db
      .query("inspirations")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .unique(),
});

export const getInspirationForDatePublic = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return null;
    return ctx.db
      .query("inspirations")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .unique();
  },
});

export const saveInspiration = internalMutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    stories: v.array(v.object({ title: v.string(), principle: v.string(), story: v.string() })),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("inspirations")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { stories: args.stories, generatedAt: Date.now() });
    } else {
      await ctx.db.insert("inspirations", {
        userId: args.userId,
        date: args.date,
        stories: args.stories,
        generatedAt: Date.now(),
      });
    }
  },
});
