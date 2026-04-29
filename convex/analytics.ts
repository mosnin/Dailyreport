import { query } from "./_generated/server";
import { v } from "convex/values";

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
  "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "must", "shall", "can",
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "it", "they",
  "them", "their", "this", "that", "these", "those", "not", "no", "so",
  "if", "then", "than", "very", "just", "about", "also", "up", "out",
  "there", "here", "when", "where", "how", "what", "which", "who",
  "feel", "feeling", "felt", "like", "get", "got", "make", "made",
  "more", "some", "any", "all", "been", "into", "too", "its", "his",
  "her", "was", "still", "much", "really", "things", "thing", "time",
  "work", "day", "week", "really", "even", "because",
]);

function getMondayOf(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export const getAnalytics = query({
  args: {
    userId: v.id("users"),
    weeks: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return null;

    const numWeeks = Math.min(args.weeks ?? 12, 24);

    const [reports, sessions, vizRecords, goals, problemStatuses] = await Promise.all([
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
      ctx.db
        .query("goals")
        .withIndex("by_user_category_period", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("problemStatuses")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
    ]);

    // ── Weekly practice data ───────────────────────────────────────────────
    const reportMap = new Map(reports.map((r) => [r.date, true]));
    const affirmMap = new Map(sessions.map((s) => [s.date, s.rounds]));
    const vizMap = new Map(vizRecords.map((v) => [v.date, v]));

    const today = new Date();
    const currentMonday = getMondayOf(today);

    const weeklyData: {
      week: string;
      label: string;
      reports: number;
      affirmations: number;
      visualizations: number;
      possible: number;
    }[] = [];

    for (let w = numWeeks - 1; w >= 0; w--) {
      const monday = new Date(currentMonday);
      monday.setDate(monday.getDate() - w * 7);

      let reportCount = 0;
      let affirmCount = 0;
      let vizCount = 0;
      let possible = 0;

      for (let d = 0; d < 7; d++) {
        const day = new Date(monday);
        day.setDate(day.getDate() + d);
        if (day > today) break;
        possible++;
        const dateStr = day.toISOString().split("T")[0];
        if (reportMap.has(dateStr)) reportCount++;
        if ((affirmMap.get(dateStr) ?? 0) >= 5) affirmCount++;
        const viz = vizMap.get(dateStr);
        if (viz && viz.scenarios.length > 0 && viz.completedIndexes.length >= viz.scenarios.length)
          vizCount++;
      }

      weeklyData.push({
        week: monday.toISOString().split("T")[0],
        label: monday.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        reports: reportCount,
        affirmations: affirmCount,
        visualizations: vizCount,
        possible,
      });
    }

    // ── Goal completion by category ────────────────────────────────────────
    const now = new Date();
    const yearKey = String(now.getFullYear());
    const qNum = Math.ceil((now.getMonth() + 1) / 3);
    const quarterKey = `${now.getFullYear()}-Q${qNum}`;
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const mondayOfWeek = getMondayOf(now);
    const weekKey = `${mondayOfWeek.getFullYear()}-${String(mondayOfWeek.getMonth() + 1).padStart(2, "0")}-${String(mondayOfWeek.getDate()).padStart(2, "0")}`;

    const periodKeys: Record<string, string> = {
      yearly: yearKey,
      quarterly: quarterKey,
      monthly: monthKey,
      weekly: weekKey,
    };

    const goalCategories = ["yearly", "quarterly", "monthly", "weekly"] as const;
    const goalStats: Record<string, { total: number; completed: number; periodKey: string }> = {};

    for (const cat of goalCategories) {
      const pk = periodKeys[cat];
      const catGoals = goals.filter((g) => g.category === cat && g.periodKey === pk);
      goalStats[cat] = {
        total: catGoals.length,
        completed: catGoals.filter((g) => g.completed).length,
        periodKey: pk,
      };
    }

    const activeGoals = goals.filter((g) => g.category !== "lifelong");
    const allTimeGoals = {
      total: activeGoals.length,
      completed: activeGoals.filter((g) => g.completed).length,
    };

    // ── Problem stats ──────────────────────────────────────────────────────
    const problemMap = new Map<string, { title: string; occurrences: number }>();
    for (const report of reports) {
      const responses = report.responses as Record<string, unknown>;
      if (!Array.isArray(responses?.problemsToSolve)) continue;
      for (const p of responses.problemsToSolve as Array<{ title?: string }>) {
        if (!p.title?.trim()) continue;
        const key = p.title.trim().toLowerCase();
        if (problemMap.has(key)) {
          problemMap.get(key)!.occurrences++;
        } else {
          problemMap.set(key, { title: p.title.trim(), occurrences: 1 });
        }
      }
    }

    const statusMap = new Map(problemStatuses.map((s) => [s.problemTitle, s]));
    let openProblems = 0;
    let resolvedProblems = 0;
    for (const [key] of problemMap) {
      const status = statusMap.get(key);
      if (status?.solvedManually || status?.aiResolved) {
        resolvedProblems++;
      } else {
        openProblems++;
      }
    }
    const totalProblems = problemMap.size;

    // ── Emotional drain themes ─────────────────────────────────────────────
    const wordFreq = new Map<string, number>();
    for (const report of reports) {
      const responses = report.responses as Record<string, unknown>;
      const text = (responses?.emotionalDrain as string) ?? "";
      if (!text.trim()) continue;
      const words = text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/);
      for (const word of words) {
        if (word.length < 4 || STOP_WORDS.has(word)) continue;
        wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
      }
    }
    const topDrainThemes = Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    // ── People network ─────────────────────────────────────────────────────
    const peopleFreq = new Map<string, number>();
    for (const report of reports) {
      const responses = report.responses as Record<string, unknown>;
      if (!Array.isArray(responses?.peopleMetToday)) continue;
      for (const p of responses.peopleMetToday as Array<{ name?: string }>) {
        if (!p.name?.trim()) continue;
        const name = p.name.trim();
        peopleFreq.set(name, (peopleFreq.get(name) ?? 0) + 1);
      }
    }
    const topPeople = Array.from(peopleFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return {
      weeklyData,
      goalStats,
      allTimeGoals,
      problemStats: {
        total: totalProblems,
        open: openProblems,
        resolved: resolvedProblems,
        resolutionRate: totalProblems > 0 ? Math.round((resolvedProblems / totalProblems) * 100) : 0,
      },
      topDrainThemes,
      topPeople,
      totalDailyReports: reports.length,
    };
  },
});
