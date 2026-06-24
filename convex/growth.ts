import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertOwner(ctx: any, userId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user || user.clerkId !== identity.subject) throw new Error("Unauthorized");
}

const TYPE = v.union(v.literal("skill"), v.literal("fear"));
const STATUS = v.union(v.literal("active"), v.literal("achieved"), v.literal("paused"));

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return [];
    const rows = await ctx.db
      .query("growthItems")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const add = mutation({
  args: {
    userId: v.id("users"),
    type: TYPE,
    title: v.string(),
    description: v.optional(v.string()),
    targetDate: v.optional(v.string()),
    linkedGoalId: v.optional(v.id("goals")),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx, args.userId);
    const now = Date.now();
    return ctx.db.insert("growthItems", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      description: args.description,
      status: "active",
      progress: 0,
      targetDate: args.targetDate,
      linkedGoalId: args.linkedGoalId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("growthItems"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    progress: v.optional(v.number()),
    status: v.optional(STATUS),
    targetDate: v.optional(v.string()),
    linkedGoalId: v.optional(v.id("goals")),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return;
    await assertOwner(ctx, row.userId);
    const { id, ...patch } = args;
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await ctx.db.patch(id, { ...clean, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("growthItems") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    if (!row) return;
    await assertOwner(ctx, row.userId);
    await ctx.db.delete(args.id);
  },
});
