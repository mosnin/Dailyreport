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
    const report = await ctx.runQuery(internal.aiInternal.getDailyReportInternal, {
      reportId: args.reportId,
    });
    if (!report) return;
    const embedding = await getEmbedding(reportToText(report.responses));
    await ctx.runMutation(internal.aiInternal.patchDailyEmbedding, {
      reportId: args.reportId,
      embedding,
    });
  },
});

export const embedWeeklyReport = internalAction({
  args: { reportId: v.id("weeklyReports") },
  handler: async (ctx, args) => {
    const report = await ctx.runQuery(internal.aiInternal.getWeeklyReportInternal, {
      reportId: args.reportId,
    });
    if (!report) return;
    const embedding = await getEmbedding(reportToText(report.responses));
    await ctx.runMutation(internal.aiInternal.patchWeeklyEmbedding, {
      reportId: args.reportId,
      embedding,
    });
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
    const embedding = await getEmbedding(args.query);

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
