import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const DREAM_CATEGORY = v.union(
  v.literal("financial"),
  v.literal("health"),
  v.literal("relationships"),
  v.literal("other")
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertOwner(ctx: any, userId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user || user.clerkId !== identity.subject) throw new Error("Unauthorized");
}

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return null;
    return ctx.db
      .query("dreams")
      .withIndex("by_user_category", (q) => q.eq("userId", args.userId))
      .order("asc")
      .collect();
  },
});

export const add = mutation({
  args: { userId: v.id("users"), category: DREAM_CATEGORY, title: v.string() },
  handler: async (ctx, args) => {
    await assertOwner(ctx, args.userId);
    return ctx.db.insert("dreams", {
      userId: args.userId,
      category: args.category,
      title: args.title.trim(),
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { dreamId: v.id("dreams") },
  handler: async (ctx, args) => {
    const dream = await ctx.db.get(args.dreamId);
    if (!dream) return;
    await assertOwner(ctx, dream.userId);
    await ctx.db.delete(args.dreamId);
  },
});

export const updateTitle = mutation({
  args: { dreamId: v.id("dreams"), title: v.string() },
  handler: async (ctx, args) => {
    const dream = await ctx.db.get(args.dreamId);
    if (!dream) return;
    await assertOwner(ctx, dream.userId);
    await ctx.db.patch(args.dreamId, { title: args.title.trim() });
  },
});
