import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getOrCreate = mutation({
  args: {
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const clerkId = identity.subject;

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      clerkId,
      email: args.email,
      name: args.name,
      onboardingComplete: false,
      createdAt: Date.now(),
    });
  },
});

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.clerkId) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

export const completeOnboarding = mutation({
  args: {
    userId: v.id("users"),
    bio: v.string(),
    timezone: v.string(),
    dreams: v.object({
      financial: v.optional(v.string()),
      health: v.optional(v.string()),
      relationships: v.optional(v.string()),
      other: v.optional(v.string()),
    }),
    yearlyGoal: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) throw new Error("Unauthorized");

    await ctx.db.patch(args.userId, {
      bio: args.bio,
      timezone: args.timezone,
      onboardingComplete: true,
    });

    const now = Date.now();
    const dreamCategories = ["financial", "health", "relationships", "other"] as const;
    for (const cat of dreamCategories) {
      const title = args.dreams[cat]?.trim();
      if (title) {
        await ctx.db.insert("dreams", {
          userId: args.userId,
          category: cat,
          title,
          createdAt: now,
        });
      }
    }

    if (args.yearlyGoal.trim()) {
      const year = new Date().getFullYear().toString();
      await ctx.db.insert("goals", {
        userId: args.userId,
        category: "yearly",
        periodKey: year,
        title: args.yearlyGoal.trim(),
        completed: false,
        createdAt: now,
      });
    }
  },
});

export const migrateLifelongGoals = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) throw new Error("Unauthorized");

    if (user.lifelongMigrated) return { migrated: 0 };

    const lifelong = await ctx.db
      .query("goals")
      .withIndex("by_user_category_period", (q) =>
        q.eq("userId", args.userId).eq("category", "lifelong").eq("periodKey", "all")
      )
      .collect();

    const now = Date.now();
    for (const g of lifelong) {
      await ctx.db.insert("dreams", {
        userId: args.userId,
        category: "other",
        title: g.title,
        createdAt: now,
      });
      await ctx.db.delete(g._id);
    }

    await ctx.db.patch(args.userId, { lifelongMigrated: true });
    return { migrated: lifelong.length };
  },
});

export const updateStyles = mutation({
  args: {
    userId: v.id("users"),
    affirmationStyle: v.optional(v.string()),
    affirmationCustomInstructions: v.optional(v.string()),
    visualizationStyle: v.optional(v.string()),
    visualizationCustomInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) throw new Error("Unauthorized");
    await ctx.db.patch(args.userId, {
      affirmationStyle: args.affirmationStyle,
      affirmationCustomInstructions: args.affirmationCustomInstructions,
      visualizationStyle: args.visualizationStyle,
      visualizationCustomInstructions: args.visualizationCustomInstructions,
    });
  },
});

// ── Admin functions ────────────────────────────────────────────────────────

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!caller || caller.role !== "admin") return null;
    return ctx.db.query("users").order("desc").collect();
  },
});

export const adminUpdatePlan = mutation({
  args: {
    targetUserId: v.id("users"),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("unlimited")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!caller || caller.role !== "admin") throw new Error("Unauthorized");
    await ctx.db.patch(args.targetUserId, { plan: args.plan, planUpdatedAt: Date.now() });
  },
});

export const adminUpdateRole = mutation({
  args: {
    targetUserId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const caller = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .unique();
    if (!caller || caller.role !== "admin") throw new Error("Unauthorized");
    await ctx.db.patch(args.targetUserId, { role: args.role });
  },
});

export const updateProfile = mutation({
  args: { userId: v.id("users"), name: v.string(), bio: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) throw new Error("Unauthorized");
    await ctx.db.patch(args.userId, {
      name: args.name.trim(),
      bio: args.bio?.trim() ?? undefined,
    });
  },
});

export const updateEmailOptOut = mutation({
  args: { userId: v.id("users"), optOut: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) throw new Error("Unauthorized");
    await ctx.db.patch(args.userId, { emailOptOut: args.optOut });
  },
});

export const updateTimezone = mutation({
  args: { userId: v.id("users"), timezone: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) throw new Error("Unauthorized");
    await ctx.db.patch(args.userId, { timezone: args.timezone });
  },
});

export const getStats = query({
  args: { userId: v.id("users"), clientDate: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return null;

    const now = Date.now();
    const createdAt = user.createdAt;
    const dayMs = 86400000;

    const daysSinceSignup = Math.floor((now - createdAt) / dayMs);
    const weeksSinceSignup = Math.floor(daysSinceSignup / 7);

    const dailyReports = await ctx.db
      .query("dailyReports")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .collect();

    const weeklyReports = await ctx.db
      .query("weeklyReports")
      .withIndex("by_user_week", (q) => q.eq("userId", args.userId))
      .collect();

    const dailyAccuracy =
      daysSinceSignup > 0
        ? Math.round((dailyReports.length / daysSinceSignup) * 100)
        : 100;

    const weeklyAccuracy =
      weeksSinceSignup > 0
        ? Math.round((weeklyReports.length / weeksSinceSignup) * 100)
        : 100;

    const submittedDates = new Set(dailyReports.map((r) => r.date));
    let streak = 0;
    // Use client-provided date to avoid UTC vs local timezone mismatch on streak calculation
    const todayStr = args.clientDate ?? new Date().toISOString().split("T")[0];
    for (let i = 0; i <= 365; i++) {
      const [y, mo, d] = todayStr.split("-").map(Number);
      const date = new Date(y, mo - 1, d - i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      if (submittedDates.has(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      dailyAccuracy: Math.min(dailyAccuracy, 100),
      weeklyAccuracy: Math.min(weeklyAccuracy, 100),
      streak,
      totalDailyReports: dailyReports.length,
      totalWeeklyReports: weeklyReports.length,
    };
  },
});
