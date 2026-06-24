import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertOwner(ctx: any, userId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user || user.clerkId !== identity.subject) throw new Error("Unauthorized");
}

export const log = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    skill: v.string(),
    minutes: v.number(),
    whatLearned: v.optional(v.string()),
    mastery: v.optional(v.number()),
    linkedGoalId: v.optional(v.id("goals")),
    linkedGrowthId: v.optional(v.id("growthItems")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx, args.userId);
    const { userId, ...rest } = args;
    return ctx.db.insert("educationLogs", { userId, ...rest, createdAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("educationLogs") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return;
    await assertOwner(ctx, row.userId);
    await ctx.db.delete(args.id);
  },
});

export const getRecent = query({
  args: { userId: v.id("users"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return [];
    const days = Math.min(args.days ?? 90, 365);
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
    const rows = await ctx.db
      .query("educationLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).gte("date", cutoff))
      .collect();
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  },
});

export const getForDate = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return [];
    return ctx.db
      .query("educationLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .collect();
  },
});

// Aggregated per-skill stats for the education domain page
export const getSkillSummary = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return [];
    const rows = await ctx.db
      .query("educationLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const map = new Map<string, { skill: string; totalMinutes: number; sessions: number; lastDate: string; mastery: number }>();
    for (const r of rows) {
      const key = r.skill.toLowerCase().trim();
      const ex = map.get(key) ?? { skill: r.skill, totalMinutes: 0, sessions: 0, lastDate: r.date, mastery: 0 };
      ex.totalMinutes += r.minutes;
      ex.sessions += 1;
      if (r.date > ex.lastDate) ex.lastDate = r.date;
      if (typeof r.mastery === "number") ex.mastery = Math.max(ex.mastery, r.mastery);
      map.set(key, ex);
    }
    return Array.from(map.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
  },
});
