import { query } from "./_generated/server";
import { v } from "convex/values";

/* ───────────────────────────────────────────────────────────────────────────
   Life Score — a weighted, credit-score-style measurement across six areas:
   Health · Goals · Finance · Emotional · Progress · Execution.

   Every area is scored 0–100 from the underlying logs over a trailing window.
   The composite is mapped onto a 300–850 "credit score" scale for flair.
   All scoring is deterministic so it renders without an AI round-trip.
   ─────────────────────────────────────────────────────────────────────────── */

export const AREA_KEYS = ["health", "goals", "finance", "emotional", "progress", "execution"] as const;
export type AreaKey = (typeof AREA_KEYS)[number];

const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const dayStr = (ms: number) => new Date(ms).toISOString().split("T")[0];
const DAY = 86400000;

function avg(nums: number[]): number | null {
  const valid = nums.filter((n) => typeof n === "number" && !Number.isNaN(n));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// Weighted blend that ignores null subscores and renormalizes the weights.
function blend(parts: Array<[number | null, number]>): { score: number; has: boolean } {
  let sum = 0;
  let wsum = 0;
  for (const [val, w] of parts) {
    if (val === null) continue;
    sum += clamp(val) * w;
    wsum += w;
  }
  if (wsum === 0) return { score: 0, has: false };
  return { score: clamp(sum / wsum), has: true };
}

type Bundle = {
  reports: any[];
  health: any[];
  finance: any[];
  education: any[];
  growth: any[];
  projects: any[];
  projectUpdates: any[];
  goalsSummary: Record<string, { total: number; completed: number }>;
  affirmations: any[];
  ritualLogs: any[];
  ritualsCount: number;
  latestMomentum: number | null;
};

type AreaResult = { score: number; needsData: boolean; factors: { label: string; value: number | string }[] };

function inWindow(date: string, startStr: string, endStr: string) {
  return date >= startStr && date <= endStr;
}

function computeArea(
  key: AreaKey,
  b: Bundle,
  endMs: number,
  windowDays: number
): AreaResult {
  const endStr = dayStr(endMs);
  const startStr = dayStr(endMs - (windowDays - 1) * DAY);
  const factors: { label: string; value: number | string }[] = [];

  if (key === "execution") {
    const reportDates = new Set(b.reports.filter((r) => inWindow(r.date, startStr, endStr)).map((r) => r.date));
    const reportRate = (reportDates.size / windowDays) * 100;
    const rLogs = b.ritualLogs.filter((l) => inWindow(l.date, startStr, endStr));
    let ritualRate: number | null = null;
    if (b.ritualsCount > 0 && rLogs.length > 0) {
      ritualRate =
        (rLogs.reduce((a, l) => a + Math.min(l.completedIds.length / b.ritualsCount, 1), 0) / rLogs.length) * 100;
    }
    let solved = 0;
    for (const r of b.reports) {
      if (!inWindow(r.date, startStr, endStr)) continue;
      const ps = (r.responses?.problemsSolvedToday ?? []) as string[];
      solved += ps.filter((s) => s && s.trim()).length;
    }
    const problemScore = Math.min(solved / (windowDays * 0.4), 1) * 100;
    const { score, has } = blend([
      [reportRate, 0.55],
      [ritualRate, 0.3],
      [problemScore, 0.15],
    ]);
    factors.push({ label: "Report consistency", value: Math.round(reportRate) });
    if (ritualRate !== null) factors.push({ label: "Rituals kept", value: Math.round(ritualRate) });
    factors.push({ label: "Problems solved", value: solved });
    return { score, needsData: !has || (reportDates.size === 0 && rLogs.length === 0), factors };
  }

  if (key === "goals") {
    let total = 0;
    let completed = 0;
    let coverage = 0;
    for (const cat of Object.keys(b.goalsSummary)) {
      const s = b.goalsSummary[cat];
      total += s.total;
      completed += s.completed;
      if (s.total > 0) coverage++;
    }
    if (total === 0) return { score: 0, needsData: true, factors: [{ label: "Active goals", value: 0 }] };
    const completion = (completed / total) * 100;
    const coverageScore = (coverage / 4) * 100;
    const score = clamp(completion * 0.7 + coverageScore * 0.3);
    factors.push({ label: "Goals completed", value: `${completed}/${total}` });
    factors.push({ label: "Horizons covered", value: `${coverage}/4` });
    return { score, needsData: false, factors };
  }

  if (key === "health") {
    const logs = b.health.filter((l) => inWindow(l.date, startStr, endStr));
    if (logs.length === 0) return { score: 0, needsData: true, factors: [{ label: "Days logged", value: 0 }] };
    const sleep = avg(logs.map((l) => l.sleepHours).filter((x: any) => x != null));
    const sleepScore = sleep === null ? null : clamp(100 - Math.abs(sleep - 8) * 16);
    const exMin = avg(logs.map((l) => l.exerciseMinutes ?? 0));
    const exScore = exMin === null ? null : Math.min(exMin / 21, 1) * 100; // ~150 min/wk
    const nutrition = avg(logs.map((l) => l.nutrition).filter((x: any) => x != null));
    const nutScore = nutrition === null ? null : nutrition * 10;
    const energy = avg(logs.map((l) => l.energy).filter((x: any) => x != null));
    const enScore = energy === null ? null : energy * 10;
    const water = avg(logs.map((l) => l.water).filter((x: any) => x != null));
    const waterScore = water === null ? null : Math.min(water / 8, 1) * 100;
    const { score, has } = blend([
      [sleepScore, 0.3],
      [exScore, 0.25],
      [nutScore, 0.2],
      [enScore, 0.15],
      [waterScore, 0.1],
    ]);
    if (sleep !== null) factors.push({ label: "Avg sleep", value: Math.round(sleep * 10) / 10 });
    if (exMin !== null) factors.push({ label: "Avg exercise (min)", value: Math.round(exMin) });
    if (energy !== null) factors.push({ label: "Avg energy", value: Math.round(energy * 10) / 10 });
    return { score, needsData: !has, factors };
  }

  if (key === "finance") {
    const logs = b.finance.filter((l) => inWindow(l.date, startStr, endStr));
    if (logs.length === 0) return { score: 0, needsData: true, factors: [{ label: "Snapshots", value: 0 }] };
    const latest = logs[logs.length - 1];
    const income = latest.income ?? 0;
    const spending = latest.spending ?? 0;
    const saved = latest.saved ?? (income > 0 ? income - spending : 0);
    const savingsRate = income > 0 ? saved / income : null;
    const savingsScore = savingsRate === null ? null : Math.min(savingsRate / 0.2, 1) * 100;
    const disciplineScore =
      income > 0 ? (spending <= income ? 100 : clamp(100 - ((spending - income) / income) * 100)) : null;
    const stress = latest.financialStress;
    const stressScore = stress == null ? null : ((10 - stress) / 9) * 100;
    const { score, has } = blend([
      [savingsScore, 0.5],
      [disciplineScore, 0.25],
      [stressScore, 0.25],
    ]);
    if (savingsRate !== null) factors.push({ label: "Savings rate", value: `${Math.round(savingsRate * 100)}%` });
    if (stress != null) factors.push({ label: "Financial stress", value: stress });
    return { score, needsData: !has, factors };
  }

  if (key === "emotional") {
    const logs = b.health.filter((l) => inWindow(l.date, startStr, endStr));
    const mood = avg(logs.map((l) => l.mood).filter((x: any) => x != null));
    const moodScore = mood === null ? null : mood * 10;
    const stress = avg(logs.map((l) => l.stress).filter((x: any) => x != null));
    const stressScore = stress === null ? null : ((10 - stress) / 9) * 100;
    const affDates = new Set(
      b.affirmations.filter((s) => inWindow(s.date, startStr, endStr) && s.rounds >= 5).map((s) => s.date)
    );
    const affScore = (affDates.size / windowDays) * 100;
    const { score, has } = blend([
      [moodScore, 0.4],
      [stressScore, 0.3],
      [affScore, 0.3],
    ]);
    if (mood !== null) factors.push({ label: "Avg mood", value: Math.round(mood * 10) / 10 });
    if (stress !== null) factors.push({ label: "Avg stress", value: Math.round(stress * 10) / 10 });
    factors.push({ label: "Affirmation days", value: affDates.size });
    return { score, needsData: !has, factors };
  }

  // progress
  {
    const active = b.projects.filter((p) => !p.archived && p.status !== "done");
    const allProjects = b.projects.filter((p) => !p.archived);
    const projAvg = allProjects.length > 0 ? avg(allProjects.map((p) => p.progress)) : null;
    const updates = b.projectUpdates.filter((u) => inWindow(u.date, startStr, endStr));
    const projMomentum = Math.min(updates.length / (windowDays * 0.25), 1) * 100;
    const eduMin = b.education
      .filter((e) => inWindow(e.date, startStr, endStr))
      .reduce((a, e) => a + (e.minutes ?? 0), 0);
    const eduScore = b.education.length > 0 ? Math.min(eduMin / (windowDays * 20), 1) * 100 : null;
    const growthActive = b.growth.filter((g) => g.status === "active");
    const growthScore = growthActive.length > 0 ? avg(growthActive.map((g) => g.progress)) : null;
    const momScore = b.latestMomentum === null ? null : ((b.latestMomentum + 100) / 200) * 100;
    const { score, has } = blend([
      [projAvg, 0.3],
      [projMomentum, 0.2],
      [eduScore, 0.2],
      [growthScore, 0.2],
      [momScore, 0.1],
    ]);
    if (projAvg !== null) factors.push({ label: "Project progress", value: `${Math.round(projAvg)}%` });
    factors.push({ label: "Updates logged", value: updates.length });
    if (eduScore !== null) factors.push({ label: "Learning (min)", value: Math.round(eduMin) });
    return {
      score,
      needsData: !has && allProjects.length === 0 && b.education.length === 0 && growthActive.length === 0,
      factors,
    };
  }
}

function compositeOf(areas: Record<AreaKey, AreaResult>) {
  const present = AREA_KEYS.filter((k) => !areas[k].needsData);
  if (present.length === 0) return 0;
  return clamp(present.reduce((a, k) => a + areas[k].score, 0) / present.length);
}

const creditScale = (composite: number) => Math.round(300 + (composite / 100) * 550);

async function loadBundle(ctx: any, userId: any, lookbackDays: number): Promise<Bundle> {
  const cutoff = dayStr(Date.now() - lookbackDays * DAY);
  const [reports, health, finance, education, growth, projects, projectUpdates, affirmations, ritualLogs, rituals, insights] =
    await Promise.all([
      ctx.db.query("dailyReports").withIndex("by_user_date", (q: any) => q.eq("userId", userId).gte("date", cutoff)).collect(),
      ctx.db.query("healthLogs").withIndex("by_user_date", (q: any) => q.eq("userId", userId).gte("date", cutoff)).collect(),
      ctx.db.query("financeLogs").withIndex("by_user_date", (q: any) => q.eq("userId", userId).gte("date", cutoff)).collect(),
      ctx.db.query("educationLogs").withIndex("by_user_date", (q: any) => q.eq("userId", userId).gte("date", cutoff)).collect(),
      ctx.db.query("growthItems").withIndex("by_user", (q: any) => q.eq("userId", userId)).collect(),
      ctx.db.query("projects").withIndex("by_user", (q: any) => q.eq("userId", userId)).collect(),
      ctx.db.query("projectUpdates").withIndex("by_user_date", (q: any) => q.eq("userId", userId).gte("date", cutoff)).collect(),
      ctx.db.query("affirmationSessions").withIndex("by_user_date", (q: any) => q.eq("userId", userId).gte("date", cutoff)).collect(),
      ctx.db.query("ritualLogs").withIndex("by_user_date", (q: any) => q.eq("userId", userId).gte("date", cutoff)).collect(),
      ctx.db.query("rituals").withIndex("by_user", (q: any) => q.eq("userId", userId)).collect(),
      ctx.db.query("aiInsights").withIndex("by_user_week", (q: any) => q.eq("userId", userId)).collect(),
    ]);

  // current-period goals summary
  const now = new Date();
  const y = String(now.getFullYear());
  const qk = `${now.getFullYear()}-Q${Math.ceil((now.getMonth() + 1) / 3)}`;
  const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const wd = new Date(now);
  const day = wd.getDay();
  wd.setDate(wd.getDate() - day + (day === 0 ? -6 : 1));
  const wk = `${wd.getFullYear()}-${String(wd.getMonth() + 1).padStart(2, "0")}-${String(wd.getDate()).padStart(2, "0")}`;
  const periodByCat: Record<string, string> = { yearly: y, quarterly: qk, monthly: mk, weekly: wk };
  const goalsSummary: Record<string, { total: number; completed: number }> = {};
  for (const cat of Object.keys(periodByCat)) {
    const goals = await ctx.db
      .query("goals")
      .withIndex("by_user_category_period", (q: any) =>
        q.eq("userId", userId).eq("category", cat).eq("periodKey", periodByCat[cat])
      )
      .collect();
    goalsSummary[cat] = { total: goals.length, completed: goals.filter((g: any) => g.completed).length };
  }

  const scored = insights.filter((i: any) => i.scores && typeof i.scores.momentum === "number");
  scored.sort((a: any, b: any) => b.weekStartDate.localeCompare(a.weekStartDate));
  const latestMomentum = scored.length > 0 ? scored[0].scores.momentum : null;

  return {
    reports, health, finance, education, growth, projects, projectUpdates,
    goalsSummary, affirmations, ritualLogs, ritualsCount: rituals.length, latestMomentum,
  };
}

export const getCurrent = query({
  args: { userId: v.id("users"), windowDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return null;

    const windowDays = Math.min(args.windowDays ?? 14, 60);
    const b = await loadBundle(ctx, args.userId, windowDays * 2 + 7);
    const now = Date.now();
    const prevEnd = now - windowDays * DAY;

    const areas = {} as Record<AreaKey, AreaResult>;
    const prevAreas = {} as Record<AreaKey, AreaResult>;
    for (const k of AREA_KEYS) {
      areas[k] = computeArea(k, b, now, windowDays);
      prevAreas[k] = computeArea(k, b, prevEnd, windowDays);
    }
    const composite = compositeOf(areas);
    const prevComposite = compositeOf(prevAreas);

    return {
      windowDays,
      composite: Math.round(composite),
      credit: creditScale(composite),
      compositeTrend: Math.round(composite - prevComposite),
      areas: AREA_KEYS.map((k) => ({
        key: k,
        score: Math.round(areas[k].score),
        needsData: areas[k].needsData,
        trend: areas[k].needsData ? 0 : Math.round(areas[k].score - prevAreas[k].score),
        factors: areas[k].factors,
      })),
    };
  },
});

export const getSeries = query({
  args: { userId: v.id("users"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return [];

    const days = Math.min(args.days ?? 30, 120);
    const windowDays = 14;
    const b = await loadBundle(ctx, args.userId, days + windowDays + 7);
    const now = Date.now();

    const out: any[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const endMs = now - i * DAY;
      const areas = {} as Record<AreaKey, AreaResult>;
      for (const k of AREA_KEYS) areas[k] = computeArea(k, b, endMs, windowDays);
      const composite = compositeOf(areas);
      out.push({
        date: dayStr(endMs),
        label: new Date(endMs).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        composite: Math.round(composite),
        health: Math.round(areas.health.score),
        goals: Math.round(areas.goals.score),
        finance: Math.round(areas.finance.score),
        emotional: Math.round(areas.emotional.score),
        progress: Math.round(areas.progress.score),
        execution: Math.round(areas.execution.score),
      });
    }
    return out;
  },
});
