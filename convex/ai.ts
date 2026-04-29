"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import OpenAI from "openai";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function getEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding;
}

function reportToText(responses: unknown): string {
  if (!responses || typeof responses !== "object") return String(responses ?? "");
  return Object.entries(responses as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

export const embedDailyReport = internalAction({
  args: { reportId: v.id("dailyReports") },
  handler: async (ctx, args) => {
    try {
      const report = await ctx.runQuery(internal.aiInternal.getDailyReportInternal, {
        reportId: args.reportId,
      });
      if (!report) return;
      const embedding = await getEmbedding(reportToText(report.responses));
      await ctx.runMutation(internal.aiInternal.patchDailyEmbedding, {
        reportId: args.reportId,
        embedding,
      });
    } catch (err) {
      // Embedding failure must not fail the report submission; it can be retried manually
      console.error("embedDailyReport failed for", args.reportId, err);
    }
  },
});

export const embedWeeklyReport = internalAction({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, args) => {
    try {
      const report = await ctx.runQuery(internal.aiInternal.getWeeklyReportInternal, {
        reportId: args.reportId,
      });
      if (!report) return;
      const embedding = await getEmbedding(reportToText(report.responses));
      await ctx.runMutation(internal.aiInternal.patchWeeklyEmbedding, {
        reportId: args.reportId,
        embedding,
      });
    } catch (err) {
      console.error("embedWeeklyReport failed for", args.reportId, err);
    }
  },
});

export const generateWeeklyInsight = internalAction({
  args: { userId: v.id("users"), weekStartDate: v.string() },
  handler: async (ctx, args) => {
    const reports = await ctx.runQuery(internal.aiInternal.getWeekReportsForInsight, {
      userId: args.userId,
      weekStartDate: args.weekStartDate,
    });
    if (!reports || (reports.daily.length === 0 && !reports.weekly)) return;

    const openai = getOpenAI();
    const context = [
      reports.weekly
        ? `Weekly report:\n${reportToText(reports.weekly.responses)}`
        : "",
      reports.daily
        .map((r: { responses: unknown }, i: number) => `Day ${i + 1}:\n${reportToText(r.responses)}`)
        .join("\n\n"),
    ]
      .filter(Boolean)
      .join("\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an accountability coach. Analyze the user's weekly reports and write 2-3 sentences highlighting patterns, progress, and encouragement. Be specific and personal.",
        },
        { role: "user", content: context },
      ],
      max_tokens: 200,
    });

    await ctx.runMutation(internal.aiInternal.saveInsight, {
      userId: args.userId,
      weekStartDate: args.weekStartDate,
      content: completion.choices[0].message.content ?? "",
    });
  },
});

export const semanticSearch = action({
  args: {
    userId: v.id("users"),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: async (ctx, args): Promise<any[]> => {
    const limit = args.limit ?? 8;
    let embedding: number[];
    try {
      embedding = await getEmbedding(args.query);
    } catch (err) {
      console.error("semanticSearch embedding failed:", err);
      throw new Error("Search unavailable. Check that OPENAI_API_KEY is set.");
    }

    const [dailyResults, weeklyResults] = await Promise.all([
      ctx.vectorSearch("dailyReports", "by_embedding", {
        vector: embedding,
        limit,
        filter: (q) => q.eq("userId", args.userId),
      }),
      ctx.vectorSearch("weeklyReports", "by_embedding", {
        vector: embedding,
        limit,
        filter: (q) => q.eq("userId", args.userId),
      }),
    ]);

    type VecResult = { _id: string; _score: number };

    const daily = await Promise.all(
      (dailyResults as VecResult[]).map(async (r) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = await ctx.runQuery(internal.aiInternal.getDailyReportInternal, { reportId: r._id as any });
        return doc ? { ...doc, type: "daily" as const, score: r._score } : null;
      })
    );

    const weekly = await Promise.all(
      (weeklyResults as VecResult[]).map(async (r) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const doc = await ctx.runQuery(internal.aiInternal.getWeeklyReportInternal, { reportId: r._id as any });
        return doc ? { ...doc, type: "weekly" as const, score: r._score } : null;
      })
    );

    return [...daily, ...weekly]
      .filter(Boolean)
      .sort((a, b) => (b!.score ?? 0) - (a!.score ?? 0))
      .slice(0, limit);
  },
});

export const generateAffirmations = action({
  args: {
    userId: v.id("users"),
    count: v.optional(v.number()),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: async (ctx, args): Promise<any> => {
    const reports = await ctx.runQuery(internal.aiInternal.getRecentReportsForInsights, {
      userId: args.userId,
    });

    const recentDaily = reports.daily
      .slice(0, 7)
      .map((r: { date: string; responses: unknown }) => reportToText(r.responses))
      .join("\n\n");

    const count = args.count ?? 5;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a life coach creating personalized affirmations.
Based on the user's recent reports (their goals, challenges, activities), generate ${count} powerful, personal, present-tense affirmations.
Make them specific to the user's actual context — reference their real goals and challenges.
Respond with this exact JSON shape: {"affirmations": ["I am...", "I have...", ...]}`,
        },
        {
          role: "user",
          content: recentDaily || "No reports yet. Generate general positive affirmations.",
        },
      ],
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content ?? '{"affirmations":[]}';
    try {
      const parsed = JSON.parse(raw);
      // Handle both {"affirmations": [...]} and bare array responses
      return Array.isArray(parsed) ? parsed : (parsed.affirmations ?? []);
    } catch {
      return [];
    }
  },
});

export const insightsChat = action({
  args: {
    userId: v.id("users"),
    message: v.string(),
    history: v.array(v.object({ role: v.string(), content: v.string() })),
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: async (ctx, args): Promise<any> => {
    const reports = await ctx.runQuery(internal.aiInternal.getRecentReportsForInsights, {
      userId: args.userId,
    });

    const dailyContext = reports.daily
      .map((r: { date: string; responses: unknown }) =>
        `[Daily ${r.date}]\n${reportToText(r.responses)}`
      )
      .join("\n\n");

    const weeklyContext = reports.weekly
      .map((r: { weekStartDate: string; responses: unknown }) =>
        `[Weekly week-of ${r.weekStartDate}]\n${reportToText(r.responses)}`
      )
      .join("\n\n");

    const dataContext = [
      dailyContext ? `DAILY REPORTS (last 30):\n${dailyContext}` : "No daily reports yet.",
      weeklyContext ? `WEEKLY REPORTS (last 12):\n${weeklyContext}` : "No weekly reports yet.",
    ].join("\n\n---\n\n");

    const systemPrompt = `You are an AI accountability coach analyzing a user's daily and weekly reports.
Your job is to surface patterns, identify weak areas, celebrate wins, and help the user improve.

You have access to their recent report history below.

${dataContext}

---

RESPONSE FORMAT: Always respond with valid JSON in this exact shape:
{
  "message": "<your text response — use markdown>",
  "chart": null | {
    "type": "bar" | "line" | "pie" | "radar",
    "title": "<chart title>",
    "description": "<1 sentence describing what the chart shows>",
    "data": <array of objects — see notes>,
    "xKey": "<field name for x-axis (bar/line only)>",
    "dataKeys": ["<y-axis field names (bar/line)>"],
    "nameKey": "<field for pie slice labels (pie only)>",
    "valueKey": "<field for pie values (pie only)>",
    "radarKeys": ["<numeric fields for radar (radar only)>"],
    "radarNameKey": "<category field for radar (radar only)>"
  }
}

Chart type guidance:
- Use "bar" for comparing categories/weeks/days (e.g. submission frequency per week)
- Use "line" for trends over time (e.g. daily mood scores)
- Use "pie" for proportions (e.g. problem categories)
- Use "radar" for multi-dimension comparisons (e.g. average scores across different life areas)
- Set chart to null when a chart wouldn't add meaningful value
- Only include a chart when the data actually supports it (e.g. 3+ data points)

If there is not enough data to answer meaningfully, say so in the message and set chart to null.`;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...args.history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: args.message },
      ],
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content ?? '{"message":"No response.","chart":null}';
    try {
      return JSON.parse(raw);
    } catch {
      return { message: raw, chart: null };
    }
  },
});

export const chat = action({
  args: {
    userId: v.id("users"),
    message: v.string(),
    history: v.array(v.object({ role: v.string(), content: v.string() })),
  },
  handler: async (ctx, args) => {
    const embedding = await getEmbedding(args.message);

    const [dailyResults, weeklyResults] = await Promise.all([
      ctx.vectorSearch("dailyReports", "by_embedding", {
        vector: embedding,
        limit: 5,
        filter: (q) => q.eq("userId", args.userId),
      }),
      ctx.vectorSearch("weeklyReports", "by_embedding", {
        vector: embedding,
        limit: 3,
        filter: (q) => q.eq("userId", args.userId),
      }),
    ]);

    const contextDocs: string[] = [];
    for (const r of dailyResults) {
      const doc = await ctx.runQuery(internal.aiInternal.getDailyReportInternal, {
        reportId: r._id,
      });
      if (doc)
        contextDocs.push(
          `[Daily report ${doc.date}]\n${reportToText(doc.responses)}`
        );
    }
    for (const r of weeklyResults) {
      const doc = await ctx.runQuery(internal.aiInternal.getWeeklyReportInternal, {
        reportId: r._id,
      });
      if (doc)
        contextDocs.push(
          `[Weekly report week of ${doc.weekStartDate}]\n${reportToText(doc.responses)}`
        );
    }

    const context = contextDocs.length
      ? `Relevant reports from your history:\n\n${contextDocs.join("\n\n")}`
      : "No relevant past reports found.";

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful accountability assistant. You have access to the user's report history. Use it to answer their questions thoughtfully.\n\n${context}`,
        },
        ...args.history.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user", content: args.message },
      ],
      max_tokens: 500,
    });

    return completion.choices[0].message.content ?? "";
  },
});
