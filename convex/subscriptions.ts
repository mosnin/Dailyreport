import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Called from /api/webhooks/creem after signature verification.
// These are intentionally auth-free - security lives in the webhook signature check.

export const activateProPlan = mutation({
  args: {
    // Checkouts started after the move to Convex Auth carry the Convex user id;
    // older ones still carry the Clerk id.
    userId: v.optional(v.string()),
    clerkId: v.optional(v.string()),
    creemCustomerId: v.string(),
    creemSubscriptionId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = args.userId ? ctx.db.normalizeId("users", args.userId) : null;
    const user = userId
      ? await ctx.db.get(userId)
      : args.clerkId
        ? await ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
            .unique()
        : null;
    if (!user) return;
    // Don't downgrade unlimited or admin users
    if (user.plan === "unlimited" || user.role === "admin") return;
    await ctx.db.patch(user._id, {
      plan: "pro",
      creemCustomerId: args.creemCustomerId,
      creemSubscriptionId: args.creemSubscriptionId,
      planUpdatedAt: Date.now(),
    });
  },
});

export const cancelProPlan = mutation({
  args: { creemSubscriptionId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_creem_subscription", (q) =>
        q.eq("creemSubscriptionId", args.creemSubscriptionId)
      )
      .unique();
    if (!user) return;
    if (user.plan === "unlimited" || user.role === "admin") return;
    await ctx.db.patch(user._id, {
      plan: "free",
      creemSubscriptionId: undefined,
      planUpdatedAt: Date.now(),
    });
  },
});
