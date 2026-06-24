import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertOwner(ctx: any, userId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user || user.clerkId !== identity.subject) throw new Error("Unauthorized");
}

const FIELDS = {
  income: v.optional(v.number()),
  spending: v.optional(v.number()),
  saved: v.optional(v.number()),
  netWorth: v.optional(v.number()),
  financialStress: v.optional(v.number()),
  category: v.optional(v.string()),
  notes: v.optional(v.string()),
};

export const upsert = mutation({
  args: { userId: v.id("users"), date: v.string(), ...FIELDS },
  handler: async (ctx, args) => {
    await assertOwner(ctx, args.userId);
    const { userId, date, ...fields } = args;
    const existing = await ctx.db
      .query("financeLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { ...fields });
      return existing._id;
    }
    return ctx.db.insert("financeLogs", { userId, date, ...fields, createdAt: Date.now() });
  },
});

export const getForDate = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return null;
    return ctx.db
      .query("financeLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .unique();
  },
});

export const getRecent = query({
  args: { userId: v.id("users"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return [];
    const days = Math.min(args.days ?? 120, 730);
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
    const rows = await ctx.db
      .query("financeLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).gte("date", cutoff))
      .collect();
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  },
});
