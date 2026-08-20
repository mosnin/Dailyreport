import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertOwner(ctx: any, userId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user || user.clerkId !== identity.subject) throw new Error("Unauthorized");
}

const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));
const DAY = 86400000;
const dayStr = (ms: number) => new Date(ms).toISOString().split("T")[0];

const FIELD = v.object({
  key: v.string(),
  label: v.string(),
  type: v.union(
    v.literal("number"),
    v.literal("scale"),
    v.literal("boolean"),
    v.literal("duration"),
    v.literal("text")
  ),
  unit: v.optional(v.string()),
  min: v.optional(v.number()),
  max: v.optional(v.number()),
  target: v.optional(v.number()),
  direction: v.optional(
    v.union(v.literal("higher"), v.literal("lower"), v.literal("target"), v.literal("boolean"))
  ),
  weight: v.number(),
});

// ── Scoring ────────────────────────────────────────────────────────────────

// Normalize a single field value to 0-100 (or null when unscored / empty).
export function scoreField(field: any, value: any): number | null {
  if (value === undefined || value === null || value === "") return null;
  if ((field.weight ?? 0) <= 0 || field.type === "text") return null;

  if (field.type === "boolean") {
    const on = value === true || value === "true";
    return field.direction === "lower" ? (on ? 0 : 100) : on ? 100 : 0;
  }

  const num = Number(value);
  if (Number.isNaN(num)) return null;

  if (field.type === "scale") {
    const min = field.min ?? 1;
    const max = field.max ?? 10;
    const t = (num - min) / Math.max(max - min, 1);
    return clamp((field.direction === "lower" ? 1 - t : t) * 100);
  }

  // number | duration
  const dir = field.direction ?? "higher";
  if (dir === "lower") {
    const target = field.target ?? 0;
    if (num <= target) return 100;
    const ref = (field.max ?? target * 2) - target || 1;
    return clamp(100 - ((num - target) / ref) * 100);
  }
  if (dir === "target") {
    const target = field.target ?? num;
    const range = (field.max ?? target * 1.5) - (field.min ?? 0) || 1;
    return clamp(100 - (Math.abs(num - target) / range) * 100);
  }
  // higher is better
  const target = field.target ?? field.max ?? num;
  if (target <= 0) return num > 0 ? 100 : 0;
  return clamp((num / target) * 100);
}

export function scoreEntry(fields: any[], values: any): number {
  let sum = 0;
  let wsum = 0;
  for (const f of fields) {
    const w = f.weight ?? 0;
    if (w <= 0) continue;
    const s = scoreField(f, values?.[f.key]);
    if (s === null) continue;
    sum += s * w;
    wsum += w;
  }
  return wsum > 0 ? Math.round(clamp(sum / wsum)) : 0;
}

function currentScore(entries: any[], cadence: string, endMs: number) {
  const windowDays = cadence === "weekly" ? 56 : 14;
  const startStr = dayStr(endMs - windowDays * DAY);
  const endStr = dayStr(endMs);
  const recent = entries.filter((e) => e.date >= startStr && e.date <= endStr);
  if (recent.length === 0) return { score: 0, needsData: true };
  const avg = recent.reduce((a, e) => a + e.score, 0) / recent.length;
  return { score: Math.round(clamp(avg)), needsData: false };
}

// Consecutive-period logging streak ending at `endMs`. The current period can be
// unlogged without breaking the streak yet (grace), so the count only drops once
// a whole day/week is missed.
function computeStreak(entries: any[], cadence: string, endMs: number) {
  if (entries.length === 0) return 0;
  const dates = new Set(entries.map((e) => e.date));
  if (cadence === "weekly") {
    const hasInWeek = (end: number) => {
      for (let d = 0; d < 7; d++) if (dates.has(dayStr(end - d * DAY))) return true;
      return false;
    };
    let streak = 0;
    let windowEnd = endMs;
    if (!hasInWeek(windowEnd)) windowEnd -= 7 * DAY;
    while (hasInWeek(windowEnd)) {
      streak++;
      windowEnd -= 7 * DAY;
    }
    return streak;
  }
  let streak = 0;
  let cursor = endMs;
  if (!dates.has(dayStr(cursor))) cursor -= DAY;
  while (dates.has(dayStr(cursor))) {
    streak++;
    cursor -= DAY;
  }
  return streak;
}

// ── CRUD ─────────────────────────────────────────────────────────────────

export const list = query({
  args: { userId: v.id("users"), includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return [];
    const rows = await ctx.db.query("trackers").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
    const filtered = args.includeArchived ? rows : rows.filter((r) => !r.archived);
    return filtered.sort((a, b) => a.order - b.order);
  },
});

export const get = query({
  args: { trackerId: v.id("trackers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const tracker = await ctx.db.get(args.trackerId);
    if (!tracker) return null;
    const user = await ctx.db.get(tracker.userId);
    if (!user || user.clerkId !== identity.subject) return null;
    return tracker;
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    color: v.string(),
    description: v.optional(v.string()),
    cadence: v.union(v.literal("daily"), v.literal("weekly")),
    fields: v.array(FIELD),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx, args.userId);
    const existing = await ctx.db.query("trackers").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
    const now = Date.now();
    return ctx.db.insert("trackers", {
      userId: args.userId,
      name: args.name,
      color: args.color,
      description: args.description,
      cadence: args.cadence,
      fields: args.fields,
      order: existing.length,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    trackerId: v.id("trackers"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    cadence: v.optional(v.union(v.literal("daily"), v.literal("weekly"))),
    fields: v.optional(v.array(FIELD)),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const tracker = await ctx.db.get(args.trackerId);
    if (!tracker) return;
    await assertOwner(ctx, tracker.userId);
    const { trackerId, ...patch } = args;
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await ctx.db.patch(trackerId, { ...clean, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { trackerId: v.id("trackers") },
  handler: async (ctx, args) => {
    const tracker = await ctx.db.get(args.trackerId);
    if (!tracker) return;
    await assertOwner(ctx, tracker.userId);
    const entries = await ctx.db.query("trackerEntries").withIndex("by_tracker_date", (q) => q.eq("trackerId", args.trackerId)).collect();
    for (const e of entries) await ctx.db.delete(e._id);
    await ctx.db.delete(args.trackerId);
  },
});

// ── Entries ────────────────────────────────────────────────────────────────

export const logEntry = mutation({
  args: { userId: v.id("users"), trackerId: v.id("trackers"), date: v.string(), values: v.any() },
  handler: async (ctx, args) => {
    await assertOwner(ctx, args.userId);
    const tracker = await ctx.db.get(args.trackerId);
    if (!tracker || tracker.userId !== args.userId) throw new Error("Forbidden");
    const score = scoreEntry(tracker.fields, args.values);
    const existing = await ctx.db
      .query("trackerEntries")
      .withIndex("by_tracker_date", (q) => q.eq("trackerId", args.trackerId).eq("date", args.date))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { values: args.values, score });
      return existing._id;
    }
    return ctx.db.insert("trackerEntries", {
      userId: args.userId,
      trackerId: args.trackerId,
      date: args.date,
      values: args.values,
      score,
      createdAt: Date.now(),
    });
  },
});

export const getEntry = query({
  args: { trackerId: v.id("trackers"), date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const tracker = await ctx.db.get(args.trackerId);
    if (!tracker) return null;
    const user = await ctx.db.get(tracker.userId);
    if (!user || user.clerkId !== identity.subject) return null;
    return ctx.db
      .query("trackerEntries")
      .withIndex("by_tracker_date", (q) => q.eq("trackerId", args.trackerId).eq("date", args.date))
      .unique();
  },
});

export const getEntries = query({
  args: { trackerId: v.id("trackers"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const tracker = await ctx.db.get(args.trackerId);
    if (!tracker) return [];
    const user = await ctx.db.get(tracker.userId);
    if (!user || user.clerkId !== identity.subject) return [];
    const days = Math.min(args.days ?? 60, 365);
    const cutoff = dayStr(Date.now() - days * DAY);
    const rows = await ctx.db
      .query("trackerEntries")
      .withIndex("by_tracker_date", (q) => q.eq("trackerId", args.trackerId).gte("date", cutoff))
      .collect();
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  },
});

// Overview for the hub + dashboard: every tracker with its current score + composite.
export const getOverview = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return null;

    const trackers = (await ctx.db.query("trackers").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect())
      .filter((t) => !t.archived)
      .sort((a, b) => a.order - b.order);

    const now = Date.now();
    const items = [];
    const present: number[] = [];
    for (const t of trackers) {
      const entries = await ctx.db
        .query("trackerEntries")
        .withIndex("by_tracker_date", (q) => q.eq("trackerId", t._id))
        .collect();
      const cur = currentScore(entries, t.cadence, now);
      const prev = currentScore(entries, t.cadence, now - (t.cadence === "weekly" ? 56 : 14) * DAY);
      const lastEntry = entries.reduce((m, e) => (e.date > m ? e.date : m), "");
      const scored = t.fields.some((f) => (f.weight ?? 0) > 0);
      if (scored && !cur.needsData) present.push(cur.score);
      items.push({
        _id: t._id,
        name: t.name,
        color: t.color,
        cadence: t.cadence,
        score: cur.score,
        needsData: cur.needsData || !scored,
        trend: cur.needsData || prev.needsData ? 0 : cur.score - prev.score,
        streak: computeStreak(entries, t.cadence, now),
        lastEntry,
        fieldCount: t.fields.length,
      });
    }
    const composite = present.length ? Math.round(present.reduce((a, b) => a + b, 0) / present.length) : 0;
    return {
      trackers: items,
      composite,
      credit: Math.round(300 + (composite / 100) * 550),
      hasScored: present.length > 0,
    };
  },
});

// Today's daily trackers with a done flag - powers the home checklist.
export const getTodayChecklist = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return [];
    const trackers = (await ctx.db.query("trackers").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect())
      .filter((t) => !t.archived && t.cadence === "daily")
      .sort((a, b) => a.order - b.order);
    const now = Date.now();
    const items = [];
    for (const t of trackers) {
      const entries = await ctx.db
        .query("trackerEntries")
        .withIndex("by_tracker_date", (q) => q.eq("trackerId", t._id))
        .collect();
      const entry = entries.find((e) => e.date === args.date);
      items.push({
        _id: t._id,
        name: t.name,
        color: t.color,
        done: entry != null,
        score: entry?.score ?? null,
        streak: computeStreak(entries, t.cadence, now),
      });
    }
    return items;
  },
});

// Full daily trackers (with fields + any values already logged today) for the
// "Log today" stepper - one screen to fill every due tracker in seconds.
export const getDueToday = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return [];
    const trackers = (await ctx.db.query("trackers").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect())
      .filter((t) => !t.archived && t.cadence === "daily")
      .sort((a, b) => a.order - b.order);
    const items = [];
    for (const t of trackers) {
      const entry = await ctx.db
        .query("trackerEntries")
        .withIndex("by_tracker_date", (q) => q.eq("trackerId", t._id).eq("date", args.date))
        .unique();
      items.push({
        _id: t._id,
        name: t.name,
        color: t.color,
        cadence: t.cadence,
        fields: t.fields,
        values: entry?.values ?? {},
        score: entry?.score ?? null,
        done: entry != null,
      });
    }
    return items;
  },
});

// Composite + per-tracker score time series for charts.
export const getSeries = query({
  args: { userId: v.id("users"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { series: [], trackers: [] };
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return { series: [], trackers: [] };

    const days = Math.min(args.days ?? 30, 120);
    const trackers = (await ctx.db.query("trackers").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect())
      .filter((t) => !t.archived && t.fields.some((f) => (f.weight ?? 0) > 0))
      .sort((a, b) => a.order - b.order);

    const entriesByTracker: Record<string, any[]> = {};
    for (const t of trackers) {
      entriesByTracker[t._id] = await ctx.db
        .query("trackerEntries")
        .withIndex("by_tracker_date", (q) => q.eq("trackerId", t._id))
        .collect();
    }

    const now = Date.now();
    const series: any[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const endMs = now - i * DAY;
      const row: any = {
        date: dayStr(endMs),
        label: new Date(endMs).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
      const present: number[] = [];
      for (const t of trackers) {
        const cur = currentScore(entriesByTracker[t._id], t.cadence, endMs);
        if (!cur.needsData) {
          row[t._id] = cur.score;
          present.push(cur.score);
        }
      }
      row.composite = present.length ? Math.round(present.reduce((a, b) => a + b, 0) / present.length) : 0;
      series.push(row);
    }
    return { series, trackers: trackers.map((t) => ({ id: t._id, name: t.name, color: t.color })) };
  },
});
