import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
    if (!identity) return [];
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return [];

    return ctx.db
      .query("affirmations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("asc")
      .collect();
  },
});

export const add = mutation({
  args: {
    userId: v.id("users"),
    text: v.string(),
    source: v.union(v.literal("manual"), v.literal("ai")),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx, args.userId);
    return ctx.db.insert("affirmations", {
      userId: args.userId,
      text: args.text,
      source: args.source,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("affirmations") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return;
    await assertOwner(ctx, item.userId);
    await ctx.db.delete(args.id);
  },
});

export const updateText = mutation({
  args: { id: v.id("affirmations"), text: v.string() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return;
    await assertOwner(ctx, item.userId);
    await ctx.db.patch(args.id, { text: args.text });
  },
});
