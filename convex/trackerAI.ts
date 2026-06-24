import { action } from "./_generated/server";
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
