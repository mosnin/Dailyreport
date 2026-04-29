import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ── Email send tracking ────────────────────────────────────────────────────

export const wasEmailSent = internalQuery({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("email_digest"), v.literal("email_reminder")),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("sentNotifications")
      .withIndex("by_user_type_date", (q) =>
        q.eq("userId", args.userId).eq("type", args.type).eq("date", args.date)
      )
      .unique();
    return result !== null;
  },
});

export const markEmailSent = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("email_digest"), v.literal("email_reminder")),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("sentNotifications", {
      userId: args.userId,
      type: args.type,
      date: args.date,
    });
  },
});

// ── Data for weekly digest ─────────────────────────────────────────────────

export const getDigestData = internalQuery({
  args: { userId: v.id("users"), weekStartDate: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Build date strings for Mon–Sun
    const monday = new Date(args.weekStartDate);
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }

    // Reports submitted this week
    const reports = await ctx.db
      .query("dailyReports")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .collect();
    const weekReports = reports.filter((r) => dates.includes(r.date));

    // Weekly report
    const weeklyReport = await ctx.db
      .query("weeklyReports")
      .withIndex("by_user_week", (q) =>
        q.eq("userId", args.userId).eq("weekStartDate", args.weekStartDate)
      )
      .unique();

    // Weekly goals
    const weeklyGoals = await ctx.db
      .query("goals")
      .withIndex("by_user_category_period", (q) =>
        q.eq("userId", args.userId).eq("category", "weekly").eq("periodKey", args.weekStartDate)
      )
      .collect();

    // Affirmation sessions this week
    const sessions = await ctx.db
      .query("affirmationSessions")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .collect();
    const weekSessions = sessions.filter((s) => dates.includes(s.date));
    const affirmDays = weekSessions.filter((s) => s.rounds >= 5).length;

    // Current streak (recompute simply)
    const reportDates = new Set(reports.map((r) => r.date));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i <= 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      if (reportDates.has(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      name: user.name.split(" ")[0],
      email: user.email,
      reportsThisWeek: weekReports.length,
      weeklyReportDone: weeklyReport !== null,
      goalsTotal: weeklyGoals.length,
      goalsCompleted: weeklyGoals.filter((g) => g.completed).length,
      affirmDays,
      streak,
    };
  },
});

// ── Users eligible for emails ──────────────────────────────────────────────

export const getUsersForDigest = internalQuery({
  args: { weekStartDate: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const eligible = [];
    for (const user of users) {
      if (!user.onboardingComplete) continue;
      if (user.emailOptOut) continue;
      // Check if already sent this week
      const sent = await ctx.db
        .query("sentNotifications")
        .withIndex("by_user_type_date", (q) =>
          q.eq("userId", user._id).eq("type", "email_digest").eq("date", args.weekStartDate)
        )
        .unique();
      if (!sent) eligible.push(user);
    }
    return eligible;
  },
});

export const getUsersForReminder = internalQuery({
  args: { weekStartDate: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    const eligible = [];
    for (const user of users) {
      if (!user.onboardingComplete) continue;
      if (user.emailOptOut) continue;
      // Already sent reminder this week?
      const reminded = await ctx.db
        .query("sentNotifications")
        .withIndex("by_user_type_date", (q) =>
          q.eq("userId", user._id).eq("type", "email_reminder").eq("date", args.date)
        )
        .unique();
      if (reminded) continue;
      // Already submitted weekly report?
      const weeklyReport = await ctx.db
        .query("weeklyReports")
        .withIndex("by_user_week", (q) =>
          q.eq("userId", user._id).eq("weekStartDate", args.weekStartDate)
        )
        .unique();
      if (!weeklyReport) eligible.push(user);
    }
    return eligible;
  },
});
