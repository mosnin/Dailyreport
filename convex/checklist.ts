import { query } from "./_generated/server";
import { v } from "convex/values";

/* Daily checklist status — one query powering the home page "what to check off"
   list. Returns done-state for every trackable daily action. */
export const getToday = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return null;

    const { userId, date } = args;
    const [report, health, affSession, viz, eduToday, updatesToday, ritualLog, rituals, finance] =
      await Promise.all([
        ctx.db.query("dailyReports").withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date)).unique(),
        ctx.db.query("healthLogs").withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date)).unique(),
        ctx.db.query("affirmationSessions").withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date)).unique(),
        ctx.db.query("visualizations").withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date)).unique(),
        ctx.db.query("educationLogs").withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date)).collect(),
        ctx.db.query("projectUpdates").withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date)).collect(),
        ctx.db.query("ritualLogs").withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date)).unique(),
        ctx.db.query("rituals").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
        ctx.db.query("financeLogs").withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date)).unique(),
      ]);

    const completedIds: string[] = ritualLog?.completedIds ?? [];
    const ritualsDone = rituals.filter((r) => completedIds.includes(r._id)).length;
    const vizDone = viz ? viz.completedIndexes.length > 0 && viz.completedIndexes.length >= viz.scenarios.length : false;

    const items = [
      { key: "report", label: "Daily report", area: "execution", done: report != null, href: "/reports/daily" },
      { key: "health", label: "Health & wellness", area: "health", done: health != null, href: "/reports/health" },
      { key: "affirmations", label: "Affirmations", area: "emotional", done: (affSession?.rounds ?? 0) >= 5, href: "/affirmations" },
      { key: "visualization", label: "Visualize", area: "emotional", done: vizDone, href: "/dreams" },
      { key: "education", label: "Learn something", area: "progress", done: eduToday.length > 0, href: "/reports/education" },
      { key: "project", label: "Advance a project", area: "progress", done: updatesToday.length > 0, href: "/reports/projects" },
      {
        key: "rituals",
        label: "Daily rituals",
        area: "execution",
        done: rituals.length > 0 && ritualsDone === rituals.length,
        href: "/rituals",
        progress: rituals.length > 0 ? { done: ritualsDone, total: rituals.length } : undefined,
      },
      { key: "finance", label: "Money check-in", area: "finance", done: finance != null, href: "/finances", optional: true },
    ];

    const core = items.filter((i) => !i.optional);
    const doneCount = core.filter((i) => i.done).length;
    return { items, doneCount, total: core.length };
  },
});
