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

    const d = new Date(args.date + "T12:00:00");
    const mondayOffset = (d.getDay() + 6) % 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - mondayOffset);
    const weekStartDate = monday.toISOString().split("T")[0];
    await ctx.scheduler.runAfter(0, internal.ai.generateWeeklyInsight, {
      userId: args.userId,
      weekStartDate,
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

export const getPeopleInsights = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return null;

    const reports = await ctx.db
      .query("dailyReports")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(180);

    const personMap = new Map<string, { name: string; count: number; goalRelatedCount: number; lastSeen: string; noteCount: number }>();
    const recentPeople: { name: string; date: string; goalRelated: boolean | null }[] = [];

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

    for (const report of reports) {
      const people = (report.responses as any)?.peopleMetToday ?? [];
      for (const p of people) {
        if (!p.name?.trim()) continue;
        const key = p.name.toLowerCase().trim();
        const existing = personMap.get(key) ?? { name: p.name, count: 0, goalRelatedCount: 0, lastSeen: report.date, noteCount: 0 };
        existing.count++;
        if (p.goalRelated === true) existing.goalRelatedCount++;
        if (p.notes?.trim()) existing.noteCount++;
        personMap.set(key, existing);
        if (report.date >= sevenDaysAgo) {
          recentPeople.push({ name: p.name, date: report.date, goalRelated: p.goalRelated ?? null });
        }
      }
    }

    const allPeople = Array.from(personMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((p) => ({
        ...p,
        goalAlignmentPct: p.count > 0 ? Math.round((p.goalRelatedCount / p.count) * 100) : 0,
      }));

    const uniqueThisMonth = new Set(
      reports
        .filter((r) => r.date >= monthStart)
        .flatMap((r) =>
          ((r.responses as any)?.peopleMetToday ?? [])
            .map((p: any) => p.name?.toLowerCase().trim())
            .filter(Boolean)
        )
    ).size;

    return {
      allPeople,
      recentPeople: recentPeople.slice(0, 15),
      uniqueThisMonth,
      totalUnique: personMap.size,
    };
  },
});

export const getYearSubmissions = query({
  args: { userId: v.id("users"), year: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return [];

    const startStr = `${args.year}-01-01`;
    const endStr = `${args.year}-12-31`;

    const reports = await ctx.db
      .query("dailyReports")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).gte("date", startStr).lte("date", endStr)
      )
      .collect();

    return reports.map((r) => r.date);
  },
});

export const patchToday = mutation({
  args: {
    userId: v.id("users"),
    field: v.union(v.literal("tomorrowPlan"), v.literal("dayActivity")),
    value: v.string(),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx, args.userId);
    const today = new Date().toISOString().split("T")[0];
    const existing = await ctx.db
      .query("dailyReports")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", today)
      )
      .unique();
    const responses = { ...((existing?.responses ?? {}) as Record<string, unknown>) };
    responses[args.field] = args.value;
    if (existing) {
      await ctx.db.patch(existing._id, { responses, submittedAt: Date.now() });
    } else {
      await ctx.db.insert("dailyReports", {
        userId: args.userId,
        date: today,
        responses,
        submittedAt: Date.now(),
      });
    }
  },
});

export const addProblemToToday = mutation({
  args: { userId: v.id("users"), title: v.string() },
  handler: async (ctx, args) => {
    await assertOwner(ctx, args.userId);
    const today = new Date().toISOString().split("T")[0];
    const existing = await ctx.db
      .query("dailyReports")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", args.userId).eq("date", today)
      )
      .unique();
    const responses = { ...((existing?.responses ?? {}) as Record<string, unknown>) };
    const problems = (
      (responses.problemsToSolve ?? []) as Array<{ id: string; title: string; solutions: string[] }>
    ).concat([{ id: crypto.randomUUID(), title: args.title, solutions: [] }]);
    responses.problemsToSolve = problems;
    if (existing) {
      await ctx.db.patch(existing._id, { responses, submittedAt: Date.now() });
    } else {
      await ctx.db.insert("dailyReports", {
        userId: args.userId,
        date: today,
        responses,
        submittedAt: Date.now(),
      });
    }
  },
});
