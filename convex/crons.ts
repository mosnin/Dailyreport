import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Hourly cron: notify users whose local time is 8pm
const crons = cronJobs();

crons.hourly("check-8pm-notifications", { minuteUTC: 0 }, internal.crons.checkNotifications);
crons.daily("generate-daily-visualizations", { hourUTC: 0, minuteUTC: 0 }, internal.crons.generateVisualizationsForAllUsers);

// Monday 9am UTC — weekly digest email (covers the previous Mon–Sun)
crons.weekly("send-weekly-digest-emails", { dayOfWeek: "monday", hourUTC: 9, minuteUTC: 0 }, internal.email.sendWeeklyDigestToAll);

// Sunday 6pm UTC — gentle reminder if weekly report not yet submitted
crons.weekly("send-weekly-reminder-emails", { dayOfWeek: "sunday", hourUTC: 18, minuteUTC: 0 }, internal.email.sendWeeklyRemindersToAll);

// Sunday 7pm UTC — generate AI week draft from the 7 daily reports
crons.weekly("generate-week-drafts", { dayOfWeek: "sunday", hourUTC: 19, minuteUTC: 0 }, internal.crons.generateWeekDraftsForAllUsers);

export default crons;

export const checkNotifications = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(internal.crons.getAllUsers);
    const nowUtc = Date.now();

    for (const user of users) {
      if (!user.timezone) continue;

      try {
        const localDate = new Date(
          new Date(nowUtc).toLocaleString("en-US", { timeZone: user.timezone })
        );
        const hour = localDate.getHours();
        const localDateStr = localDate.toISOString().split("T")[0];

        // Morning briefing at 8am — agent pre-briefs before the user opens the app
        if (hour === 8) {
          try {
            await ctx.runAction(
              // @ts-ignore — agentScheduler added in parallel; run npx convex dev --once
              (internal as any).agentScheduler.triggerMorningBriefing,
              { userId: user._id, clerkId: user.clerkId }
            );
          } catch (err) {
            console.error(`Morning briefing failed for ${user._id}:`, err);
          }
        }

        // Evening notifications at 8pm
        if (hour !== 20) continue;

        // Daily notification (every day)
        const dailySent = await ctx.runQuery(internal.crons.wasNotificationSent, {
          userId: user._id,
          type: "daily",
          date: localDateStr,
        });
        if (!dailySent) {
          await ctx.runMutation(internal.crons.markNotificationSent, {
            userId: user._id,
            type: "daily",
            date: localDateStr,
          });
          await ctx.runAction(internal.pushNotifications.sendPushToUser, {
            userId: user._id,
            title: "Time for your daily report",
            body: "Take 2 minutes to reflect on your day.",
            url: "/reports/daily",
          });
        }

        // Weekly notification (Sundays only)
        if (localDate.getDay() === 0) {
          const weeklySent = await ctx.runQuery(internal.crons.wasNotificationSent, {
            userId: user._id,
            type: "weekly",
            date: localDateStr,
          });
          if (!weeklySent) {
            await ctx.runMutation(internal.crons.markNotificationSent, {
              userId: user._id,
              type: "weekly",
              date: localDateStr,
            });
            await ctx.runAction(internal.pushNotifications.sendPushToUser, {
              userId: user._id,
              title: "Time for your weekly report",
              body: "Reflect on your week and set intentions for next week.",
              url: "/reports/weekly",
            });
          }
        }
      } catch {
        // skip users with invalid timezone
      }
    }
  },
});

// Weekly insight generation: Monday at 00:00 UTC
crons.weekly(
  "generate-weekly-insights",
  { dayOfWeek: "monday", hourUTC: 0, minuteUTC: 0 },
  internal.crons.generateInsightsForAllUsers
);

export const generateInsightsForAllUsers = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(internal.crons.getAllUsers);
    const monday = new Date();
    monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
    const weekStartDate = monday.toISOString().split("T")[0];

    for (const user of users) {
      await ctx.runAction(internal.ai.generateWeeklyInsight, {
        userId: user._id,
        weekStartDate,
      });
    }
  },
});

function localDateInTimezone(timezone: string | undefined): string {
  if (!timezone) return new Date().toISOString().split("T")[0];
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

export const generateWeekDraftsForAllUsers = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(internal.crons.getAllUsers);
    // Sunday: Monday of the current week is Sunday - 6 days
    const sunday = new Date();
    const monday = new Date(sunday);
    monday.setUTCDate(sunday.getUTCDate() - 6);
    const weekStartDate = monday.toISOString().split("T")[0];

    for (const user of users) {
      try {
        await ctx.runAction(internal.ai.generateSundayWeekDraft, {
          userId: user._id,
          weekStartDate,
        });
      } catch (err) {
        console.error(`generateWeekDraftsForAllUsers failed for ${user._id}:`, err);
      }
    }
  },
});

export const generateVisualizationsForAllUsers = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(internal.crons.getAllUsers);
    for (const user of users) {
      if (!user.onboardingComplete) continue;
      try {
        // Use the user's local date so we generate the right "today" for them,
        // not UTC. Without this, users west of UTC see the wrong day's content.
        const localDate = localDateInTimezone(user.timezone);
        await ctx.runAction(internal.ai.generateVisualizationsInternal, {
          userId: user._id,
          date: localDate,
        });
      } catch (err) {
        console.error(`generateVisualizationsForAllUsers failed for ${user._id}:`, err);
      }
    }
  },
});

export const getAllUsers = internalQuery({
  args: {},
  handler: async (ctx) => ctx.db.query("users").collect(),
});

export const wasNotificationSent = internalQuery({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("daily"), v.literal("weekly")),
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

export const markNotificationSent = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.union(v.literal("daily"), v.literal("weekly")),
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
