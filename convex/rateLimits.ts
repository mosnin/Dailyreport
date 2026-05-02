import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Per-day limits by plan tier
const LIMITS: Record<string, Record<string, number>> = {
  chat: {
    free: 10,
    pro: 50,
    unlimited: 500,
  },
  insightsChat: {
    free: 5,
    pro: 25,
    unlimited: 200,
  },
  affirmations: {
    free: 3,
    pro: 15,
    unlimited: 100,
  },
  semanticSearch: {
    free: 10,
    pro: 20,
    unlimited: 50,
  },
  generateVisualizations: {
    free: 3,
    pro: 10,
    unlimited: 50,
  },
  regenerateWeeklyInsight: {
    free: 2,
    pro: 10,
    unlimited: 50,
  },
  inspiration: {
    free: 2,
    pro: 5,
    unlimited: 20,
  },
};

/**
 * Checks daily rate limit for a userId + action combo.
 * Throws if over limit. Increments count on success.
 * Admins and missing plan (treated as free) handled consistently.
 */
export const checkAndConsume = internalMutation({
  args: {
    userId: v.id("users"),
    action: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Admins have no limits
    if (user.role === "admin") return;

    const plan = user.plan ?? "free";

    // Unlimited plan has very high limits (effectively unlimited)
    if (plan === "unlimited") return;

    const actionLimits = LIMITS[args.action];
    if (!actionLimits) return; // unknown action — allow

    const limit = actionLimits[plan] ?? actionLimits.free;
    const today = new Date().toISOString().split("T")[0];

    const existing = await ctx.db
      .query("rateLimitUsage")
      .withIndex("by_user_action_date", (q) =>
        q.eq("userId", args.userId).eq("action", args.action).eq("date", today)
      )
      .unique();

    const currentCount = existing?.count ?? 0;

    if (currentCount >= limit) {
      const planLabel = plan === "pro" ? "Pro" : "Free";
      throw new Error(
        `Daily limit reached. ${planLabel} plan allows ${limit} ${args.action} requests per day. Upgrade for higher limits.`
      );
    }

    if (existing) {
      await ctx.db.patch(existing._id, { count: currentCount + 1 });
    } else {
      await ctx.db.insert("rateLimitUsage", {
        userId: args.userId,
        action: args.action,
        date: today,
        count: 1,
      });
    }
  },
});
