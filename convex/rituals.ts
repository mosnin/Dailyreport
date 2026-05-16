import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const all = await ctx.db
      .query("rituals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return all.sort((a, b) => a.order - b.order);
  },
});

export const add = mutation({
  args: { userId: v.id("users"), title: v.string() },
  handler: async (ctx, { userId, title }) => {
    const existing = await ctx.db
      .query("rituals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return ctx.db.insert("rituals", {
      userId,
      title: title.trim(),
      order: existing.length,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: { ritualId: v.id("rituals"), title: v.string() },
  handler: async (ctx, { ritualId, title }) => {
    await ctx.db.patch(ritualId, { title: title.trim() });
  },
});

export const remove = mutation({
  args: { ritualId: v.id("rituals") },
  handler: async (ctx, { ritualId }) => {
    await ctx.db.delete(ritualId);
  },
});

export const reorder = mutation({
  args: { orderedIds: v.array(v.id("rituals")) },
  handler: async (ctx, { orderedIds }) => {
    await Promise.all(orderedIds.map((id, i) => ctx.db.patch(id, { order: i })));
  },
});

export const getLog = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, { userId, date }) => {
    return ctx.db
      .query("ritualLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .unique();
  },
});

export const toggle = mutation({
  args: { userId: v.id("users"), date: v.string(), ritualId: v.string() },
  handler: async (ctx, { userId, date, ritualId }) => {
    const log = await ctx.db
      .query("ritualLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .unique();

    if (!log) {
      await ctx.db.insert("ritualLogs", { userId, date, completedIds: [ritualId] });
    } else {
      const has = log.completedIds.includes(ritualId);
      await ctx.db.patch(log._id, {
        completedIds: has
          ? log.completedIds.filter((id) => id !== ritualId)
          : [...log.completedIds, ritualId],
      });
    }
  },
});

export const getCalendarData = query({
  args: { userId: v.id("users"), year: v.number(), month: v.number() },
  handler: async (ctx, { userId, year, month }) => {
    const rituals = await ctx.db
      .query("rituals")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const totalRituals = rituals.length;
    if (totalRituals === 0) return {};

    const padded = String(month + 1).padStart(2, "0");
    const startDate = `${year}-${padded}-01`;
    const nextMonth = month === 11 ? `${year + 1}-01-01` : `${year}-${String(month + 2).padStart(2, "0")}-01`;

    const logs = await ctx.db
      .query("ritualLogs")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).gte("date", startDate).lt("date", nextMonth)
      )
      .collect();

    const result: Record<string, { total: number; completed: number }> = {};
    for (const log of logs) {
      result[log.date] = { total: totalRituals, completed: log.completedIds.length };
    }
    return result;
  },
});
