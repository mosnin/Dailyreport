import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertOwner(ctx: any, userId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user || user.clerkId !== identity.subject) throw new Error("Unauthorized");
}

export const listByDate = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return [];
    return ctx.db
      .query("givingEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .order("asc")
      .collect();
  },
});

export const listRecent = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return [];
    return ctx.db
      .query("givingEntries")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(300);
  },
});

export const add = mutation({
  args: { userId: v.id("users"), date: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    await assertOwner(ctx, args.userId);
    return ctx.db.insert("givingEntries", {
      userId: args.userId,
      date: args.date,
      text: args.text,
      createdAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("givingEntries") },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return;
    await assertOwner(ctx, item.userId);
    await ctx.db.delete(args.id);
  },
});

export const updateText = mutation({
  args: { id: v.id("givingEntries"), text: v.string() },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.id);
    if (!item) return;
    await assertOwner(ctx, item.userId);
    await ctx.db.patch(args.id, { text: args.text });
  },
});
