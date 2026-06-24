import { action, query, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import OpenAI from "openai";

/**
 * AI tracker designer. The user describes what they want to measure in plain
 * language; the model returns a complete tracker definition (fields + scoring)
 * that the dynamic UI renders. Supports refinement by passing the current draft.
 */
export const design = action({
  args: {
    userId: v.id("users"),
    message: v.string(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    current: v.optional(v.any()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ reply: string; tracker: any | null }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const system = `You design personal "trackers" for a life-analytics app. A tracker is a custom thing a user measures over time (e.g. fitness, sobriety, a startup's metrics, learning Spanish, sleep, mood, savings). You return a tracker definition that the app renders into a log form, a 0-100 score, and charts.

Return JSON in EXACTLY this shape:
{
  "reply": "<1-2 friendly sentences explaining what you built or changed>",
  "tracker": {
    "name": "<short name>",
    "emoji": "<a single emoji that represents it>",
    "color": "<one of: sky, emerald, violet, amber, rose, orange, blue, pink, lime, cyan, indigo, teal>",
    "description": "<one short sentence>",
    "cadence": "daily" | "weekly",
    "fields": [
      {
        "key": "<camelCase machine key>",
        "label": "<human label>",
        "type": "number" | "scale" | "boolean" | "duration" | "text",
        "unit": "<optional unit e.g. hrs, $, glasses>",
        "min": <optional number>,
        "max": <optional number>,
        "target": <optional number: the ideal value>,
        "direction": "higher" | "lower" | "target" | "boolean",
        "weight": <0 to 1: how much this field counts toward the score; 0 = logged but not scored>
      }
    ]
  }
}

Rules:
- 3 to 7 fields. Pick the most meaningful things to log.
- "scale" is a 1-10 rating (mood, energy, motivation). "duration" is minutes. "number" is any count/amount. "boolean" is yes/no. "text" is a note (always weight 0).
- For every scored field (weight > 0) set a sensible "direction" and, for number/duration, a realistic "target" (and min/max). "higher" = more is better, "lower" = less is better, "target" = closeness to a target is best, "boolean" = true is good.
- Weights should sum to roughly 1 across scored fields. Always include at least one short "text" note field (weight 0).
- If the user is refining an existing tracker (provided below), modify it rather than starting over.
- Keep it specific to what the user actually asked for.`;

    const userMsg = args.current
      ? `Current tracker draft:\n${JSON.stringify(args.current)}\n\nUser request: ${args.message}`
      : `User request: ${args.message}`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      const t = parsed.tracker;
      if (!t || !Array.isArray(t.fields)) {
        return { reply: typeof parsed.reply === "string" ? parsed.reply : "I could not build that, try rephrasing.", tracker: null };
      }
      // Sanitize
      const fields = t.fields.slice(0, 10).map((f: any, i: number) => ({
        key: String(f.key ?? `field${i}`).replace(/[^a-zA-Z0-9_]/g, "").slice(0, 40) || `field${i}`,
        label: String(f.label ?? "Field"),
        type: ["number", "scale", "boolean", "duration", "text"].includes(f.type) ? f.type : "number",
        unit: f.unit ? String(f.unit).slice(0, 16) : undefined,
        min: typeof f.min === "number" ? f.min : undefined,
        max: typeof f.max === "number" ? f.max : undefined,
        target: typeof f.target === "number" ? f.target : undefined,
        direction: ["higher", "lower", "target", "boolean"].includes(f.direction) ? f.direction : "higher",
        weight: typeof f.weight === "number" ? Math.max(0, Math.min(1, f.weight)) : 0.2,
      }));
      const tracker = {
        name: String(t.name ?? "My tracker").slice(0, 60),
        emoji: typeof t.emoji === "string" ? t.emoji.slice(0, 4) : "✨",
        color: typeof t.color === "string" ? t.color : "sky",
        description: t.description ? String(t.description).slice(0, 200) : undefined,
        cadence: t.cadence === "weekly" ? "weekly" : "daily",
        fields,
      };
      return { reply: typeof parsed.reply === "string" ? parsed.reply : "Here is your tracker.", tracker };
    } catch (e) {
      console.error("trackerAI.design failed", e);
      throw new Error("Could not design that tracker right now.");
    }
  },
});

// ── Proactive coach ─────────────────────────────────────────────────────────

// Today's cached coach insight (null until generated). The home screen reads
// this and triggers `coach` once per day if it's missing.
export const getCoachInsight = query({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return null;
    return ctx.db
      .query("trackerInsights")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .unique();
  },
});

export const saveCoachInsight = internalMutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    headline: v.string(),
    body: v.string(),
    tone: v.optional(v.string()),
    focusTrackerId: v.optional(v.id("trackers")),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("trackerInsights")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).eq("date", args.date))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        headline: args.headline,
        body: args.body,
        tone: args.tone,
        focusTrackerId: args.focusTrackerId,
        generatedAt: Date.now(),
      });
      return existing._id;
    }
    return ctx.db.insert("trackerInsights", {
      userId: args.userId,
      date: args.date,
      headline: args.headline,
      body: args.body,
      tone: args.tone,
      focusTrackerId: args.focusTrackerId,
      generatedAt: Date.now(),
    });
  },
});

// Reads across every tracker (current score, 7-day trend, streak) and returns
// the single most useful nudge - a win to celebrate or a drag to address.
export const coach = action({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (
    ctx,
    args
  ): Promise<{ headline: string; body: string; tone: string; focusTrackerId: string | null } | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const overview: any = await ctx.runQuery(api.trackers.getOverview, { userId: args.userId });
    const trackers: any[] = overview?.trackers ?? [];
    if (trackers.length === 0) return null;

    const lines = trackers
      .map((t) => {
        const score = t.needsData ? "no data yet" : `${t.score}/100`;
        const trend = t.trend > 0 ? `up ${t.trend}` : t.trend < 0 ? `down ${Math.abs(t.trend)}` : "flat";
        const streak = t.streak > 0 ? `${t.streak}-day streak` : "no active streak";
        return `- ${t.name} (id:${t._id}): ${score}, ${trend} vs prior window, ${streak}`;
      })
      .join("\n");

    const system = `You are the proactive coach inside a life-analytics app. The user tracks several custom things, each scored 0-100. You get a snapshot and must surface the SINGLE most useful insight right now - either celebrate real momentum or flag the one thing dragging their overall score. Be specific, warm, and direct. No fluff, no lists, no emojis, no dashes.

Return JSON in EXACTLY this shape:
{
  "headline": "<max 6 words, punchy>",
  "body": "<1-2 sentences, specific to the data, naming the tracker>",
  "tone": "win" | "warn" | "nudge",
  "focusTrackerId": "<the id of the tracker this is about, or null>"
}

Pick "win" when celebrating a streak or rising score, "warn" when a tracker is dropping or neglected, "nudge" otherwise. Composite life score is ${overview?.hasScored ? overview.composite + "/100" : "not established yet"}.`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Today is ${args.date}. Tracker snapshot:\n${lines}` },
        ],
      });
      const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      const validIds = new Set(trackers.map((t) => String(t._id)));
      const focusTrackerId =
        typeof parsed.focusTrackerId === "string" && validIds.has(parsed.focusTrackerId)
          ? parsed.focusTrackerId
          : null;
      const result = {
        headline: String(parsed.headline ?? "Keep climbing").slice(0, 80),
        body: String(parsed.body ?? "Log your trackers today to keep your score moving.").slice(0, 280),
        tone: ["win", "warn", "nudge"].includes(parsed.tone) ? parsed.tone : "nudge",
        focusTrackerId,
      };
      await ctx.runMutation(internal.trackerAI.saveCoachInsight, {
        userId: args.userId,
        date: args.date,
        headline: result.headline,
        body: result.body,
        tone: result.tone,
        focusTrackerId: focusTrackerId ? (focusTrackerId as any) : undefined,
      });
      return result;
    } catch (e) {
      console.error("trackerAI.coach failed", e);
      return null;
    }
  },
});
