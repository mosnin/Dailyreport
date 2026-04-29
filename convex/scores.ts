import { query } from "./_generated/server";
import { v } from "convex/values";

export const getDailyScores = query({
  args: {
    userId: v.id("users"),
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return null;

    const numDays = Math.min(args.days ?? 60, 90);
    const today = new Date();

    // Build the cutoff date string for filtering
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - (numDays - 1));
    const cutoffStr = cutoff.toISOString().split("T")[0];

    // Fetch all three data sets in parallel using Promise.all
    const [reports, sessions, vizRecords] = await Promise.all([
      ctx.db
        .query("dailyReports")
        .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("affirmationSessions")
        .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("visualizations")
        .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
        .collect(),
    ]);

    // Build lookup sets for O(1) per-day checks
    const reportDates = new Set(
      reports.filter((r) => r.date >= cutoffStr).map((r) => r.date)
    );
    const affirmDates = new Set(
      sessions
        .filter((s) => s.date >= cutoffStr && s.rounds >= 5)
        .map((s) => s.date)
    );
    const vizDates = new Set(
      vizRecords
        .filter(
          (v) =>
            v.date >= cutoffStr &&
            v.scenarios.length > 0 &&
            v.completedIndexes.length >= v.scenarios.length
        )
        .map((v) => v.date)
    );

    // Build per-day results with running cumulative score
    let cumulative = 0;
    const data: {
      date: string;
      label: string;
      earned: number;
      cumulative: number;
      report: boolean;
      affirmations: boolean;
      visualizations: boolean;
    }[] = [];

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];

      const report = reportDates.has(dateStr);
      const affirmations = affirmDates.has(dateStr);
      const visualizations = vizDates.has(dateStr);
      const earned = report && affirmations && visualizations ? 1 : 0;
      cumulative += earned;

      data.push({
        date: dateStr,
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        earned,
        cumulative,
        report,
        affirmations,
        visualizations,
      });
    }

    const perfectDays = data.filter((d) => d.earned === 1).length;

    return {
      data,
      totalScore: cumulative,
      perfectDays,
      numDays,
    };
  },
});
