"use node";

import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import OpenAI from "openai";

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function affirmationStylePrompt(style: string, customInstructions: string | null): string {
  switch (style) {
    case "power":
      return `Each affirmation must be short, commanding, and declarative (2–3 short punchy sentences max).
Present tense only. No soft language — bold, direct, owned.
Example: "I run a seven-figure business. Every move I make compounds my power. I am built for this."`;
    case "spiritual":
      return `Each affirmation should feel deeply spiritual and energetically resonant.
Use language around universal alignment, divine flow, energy, and infinite abundance.
Example: "The universe has already delivered this into my reality. I am a vessel of infinite abundance, in perfect alignment with all I desire."`;
    case "poetic":
      return `Each affirmation should be beautifully written with original metaphor and lyrical language.
Avoid clichés. Use evocative imagery rooted in the user's specific dream or goal.
Example: "Like a river that carves through stone with patient certainty, I have carved my path — and wealth flows to me as naturally as water finds the sea."`;
    case "identity":
      return `Each affirmation should focus on the identity of the person — WHO they are, not just what they have.
Begin with or include phrases like "I am the kind of person who..." or ground in a core identity statement.
Example: "I am the kind of person who builds extraordinary things. Creating wealth isn't something I chase — it's simply who I am at my core."`;
    case "custom":
      return customInstructions?.trim()
        ? customInstructions.trim()
        : `Write powerful, personal affirmations in present tense rooted in the user's dreams and goals.`;
    default: // "grateful"
      return `Each affirmation MUST follow this exact pattern:
"I am so happy and grateful that I am [restate the dream/goal as a present reality]"
Write as though the dream is already fully realized. Keep each to one joyful, specific sentence.`;
  }
}

function visualizationStylePrompt(style: string, customInstructions: string | null): string {
  switch (style) {
    case "meditative":
      return `Generate calm, meditative visualization scenarios. Slow pace, breath-anchored, gentle body awareness.
No high drama or peak performance — pure peaceful knowing that the dream has arrived.
Use soft, present-moment sensory detail: warmth in the chest, settled breathing, quiet joy, spaciousness.
Write in second person present tense, 3–4 sentences.`;
    case "athletic":
      return `Generate high-energy, peak-performance visualization scenarios. Adrenaline, physical power, sharp mental focus, the electricity of being completely dialed in.
The user is operating at their absolute best — a warrior, a champion at the moment of victory.
Use intense, kinetic language. Heart rate, breath, muscle memory, the surge of winning.
Write in second person present tense, 3–4 sentences.`;
    case "spiritual":
      return `Generate spiritually-oriented visualization scenarios. Light expanding from the heart center, energy fields, divine alignment, the higher self witnessing the fulfilled dream.
Use language of universal love, quantum possibility, divine timing, and energetic truth.
The scene should feel transcendent and deeply connected to something larger than the individual.
Write in second person present tense, 3–4 sentences.`;
    case "narrative":
      return `Generate first-person narrative scenarios with a brief story arc: first a flash of remembering the struggle, then arriving fully in the moment of resolution.
The story has a beginning (a nod to who you were), a turning point, and an ending (the present reality of achievement).
Make it emotionally resonant — the contrast between the past doubt and present truth.
Write in second person present tense, 3–4 sentences.`;
    case "custom":
      return customInstructions?.trim()
        ? customInstructions.trim()
        : `Generate vivid, sensory-immersive visualization scenarios in second person present tense, 3–4 sentences each.`;
    default: // "cinematic"
      return `Generate intensely sensory, cinematic visualization scenarios.
Each must place the user inside a SPECIFIC, CONCRETE moment where the dream is already achieved.
Use rich sensory detail: what they see, hear, feel in their body, the emotional weight of the moment.
Write in second person present tense ("You are...", "You feel the weight of..."), 3–4 sentences.`;
  }
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

function getMondayForDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().split("T")[0];
}

export const generateWeeklyInsight = internalAction({
  args: { userId: v.id("users"), weekStartDate: v.string() },
  handler: async (ctx, args) => {
    const [reports, priorHistory] = await Promise.all([
      ctx.runQuery(internal.aiInternal.getWeekReportsForInsight, {
        userId: args.userId,
        weekStartDate: args.weekStartDate,
      }),
      ctx.runQuery(internal.aiInternal.getProgressHistoryInternal, {
        userId: args.userId,
      }),
    ]);
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

    type PriorInsight = { weekStartDate: string; scores?: { momentum: number; execution: number; wellbeing: number; growth: number } };
    const priorScoresText = (priorHistory as PriorInsight[])
      .filter((r) => r.scores)
      .map((r) => `Week of ${r.weekStartDate}: momentum=${r.scores!.momentum}, execution=${r.scores!.execution}, wellbeing=${r.scores!.wellbeing}, growth=${r.scores!.growth}`)
      .join("\n");

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are an accountability coach. Analyze the user's weekly reports and return JSON in this exact shape:
{
  "insight": "<2-3 sentence insight highlighting patterns, progress, and encouragement>",
  "scores": {
    "momentum": <integer -100 to 100>,
    "execution": <integer 0 to 100>,
    "wellbeing": <integer 0 to 100>,
    "growth": <integer 0 to 100>
  }
}

Scoring rubric:
- momentum (-100 to 100): direction of travel vs prior weeks. Negative = declining, 0 = steady, positive = improving. Use prior week scores below for calibration.
- execution (0-100): % of stated goals that were actually completed this week
- wellbeing (0-100): emotional health and energy level shown in reports
- growth (0-100): problem-solving effectiveness and learning demonstrated
${priorScoresText ? `\nPrior weeks for momentum calibration:\n${priorScoresText}` : ""}`,
          },
          { role: "user", content: context },
        ],
        max_tokens: 350,
      });

      const raw = completion.choices[0].message.content ?? "{}";
      let insight = "";
      let scores: { momentum: number; execution: number; wellbeing: number; growth: number } | undefined;
      try {
        const parsed = JSON.parse(raw);
        insight = parsed.insight ?? "";
        scores = parsed.scores ?? undefined;
      } catch {
        insight = raw;
      }

      await ctx.runMutation(internal.aiInternal.saveInsight, {
        userId: args.userId,
        weekStartDate: args.weekStartDate,
        content: insight,
        scores,
      });
    } catch (err) {
      console.error("generateWeeklyInsight failed for", args.userId, err);
    }
  },
});

export const analyzeProgress = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const [reports, existingInsights] = await Promise.all([
      ctx.runQuery(internal.aiInternal.getRecentReportsForInsights, { userId: args.userId }),
      ctx.runQuery(internal.aiInternal.getProgressHistoryInternal, { userId: args.userId }),
    ]);

    if (reports.daily.length === 0 && reports.weekly.length === 0) return;

    // Group daily reports by Monday-week
    const byWeek: Record<string, { daily: { date: string; responses: unknown }[]; weekly: { responses: unknown }[] }> = {};
    for (const r of reports.daily as { date: string; responses: unknown }[]) {
      const mon = getMondayForDate(r.date);
      if (!byWeek[mon]) byWeek[mon] = { daily: [], weekly: [] };
      byWeek[mon].daily.push(r);
    }
    for (const r of reports.weekly as { weekStartDate: string; responses: unknown }[]) {
      const wk = r.weekStartDate;
      if (!byWeek[wk]) byWeek[wk] = { daily: [], weekly: [] };
      byWeek[wk].weekly.push(r);
    }

    // Only score weeks without scores yet
    type ExistingInsight = { weekStartDate: string; scores?: unknown };
    const alreadyScored = new Set(
      (existingInsights as ExistingInsight[]).filter((i) => i.scores).map((i) => i.weekStartDate)
    );
    const weeksToScore = Object.keys(byWeek).filter((w) => !alreadyScored.has(w)).sort();
    if (weeksToScore.length === 0) return;

    const weekContexts = weeksToScore.map((week) => {
      const data = byWeek[week];
      const dailyText = data.daily
        .map((r, i) => `Day ${i + 1}: ${reportToText(r.responses)}`)
        .join("\n");
      const weeklyText = data.weekly[0] ? `Weekly review: ${reportToText(data.weekly[0].responses)}` : "";
      return { week, context: [dailyText, weeklyText].filter(Boolean).join("\n") };
    });

    // Prior scored weeks for momentum calibration
    const priorScoresText = (existingInsights as ExistingInsight[])
      .filter((r) => r.scores)
      .map((r) => {
        const s = r.scores as { momentum: number; execution: number; wellbeing: number; growth: number };
        return `Week of ${r.weekStartDate}: momentum=${s.momentum}, execution=${s.execution}, wellbeing=${s.wellbeing}, growth=${s.growth}`;
      })
      .join("\n");

    const openai = getOpenAI();
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are an accountability coach scoring weekly report data.
For each week provided, score these 4 dimensions:
- momentum (-100 to 100): direction of travel. Score chronologically — early weeks set the baseline, later weeks are judged relative to each other and to prior history.
- execution (0-100): % of stated goals actually completed
- wellbeing (0-100): emotional health and energy level
- growth (0-100): problem-solving effectiveness and learning rate

${priorScoresText ? `Prior scored weeks for momentum calibration:\n${priorScoresText}\n` : ""}
Return JSON: { "weeks": [ { "weekStartDate": "YYYY-MM-DD", "scores": { "momentum": N, "execution": N, "wellbeing": N, "growth": N } } ] }`,
          },
          {
            role: "user",
            content: weekContexts
              .map((w) => `=== Week of ${w.week} ===\n${w.context}`)
              .join("\n\n---\n\n"),
          },
        ],
        max_tokens: 800,
      });

      const raw = completion.choices[0].message.content ?? '{"weeks":[]}';
      let scoredWeeks: Array<{ weekStartDate: string; scores: { momentum: number; execution: number; wellbeing: number; growth: number } }> = [];
      try {
        const parsed = JSON.parse(raw);
        scoredWeeks = parsed.weeks ?? [];
      } catch {
        return;
      }

      for (const { weekStartDate, scores } of scoredWeeks) {
        await ctx.runMutation(internal.aiInternal.saveProgressScores, {
          userId: args.userId,
          weekStartDate,
          scores,
        });
      }
    } catch (err) {
      console.error("analyzeProgress failed:", err);
    }
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
    await ctx.runMutation(internal.rateLimits.checkAndConsume, { userId: args.userId, action: "semanticSearch" });
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
    await ctx.runMutation(internal.rateLimits.checkAndConsume, { userId: args.userId, action: "affirmations" });
    const [dreams, goals, reports, styles] = await Promise.all([
      ctx.runQuery(internal.aiInternal.getAllDreams, { userId: args.userId }),
      ctx.runQuery(internal.aiInternal.getGoalsForVisualization, { userId: args.userId }),
      ctx.runQuery(internal.aiInternal.getRecentReportsForInsights, { userId: args.userId }),
      ctx.runQuery(internal.aiInternal.getUserStyles, { userId: args.userId }),
    ]);

    const dreamLines: string[] = [];
    const categoryLabels: Record<string, string> = {
      financial: "Financial",
      health: "Health",
      relationships: "Relationships",
      other: "Other",
    };
    for (const [cat, titles] of Object.entries(dreams as Record<string, string[]>)) {
      for (const t of titles) {
        dreamLines.push(`[${categoryLabels[cat]}] ${t}`);
      }
    }

    const goalLines: string[] = [
      ...(goals.yearly as string[]).map((t: string) => `[This year] ${t}`),
      ...(goals.monthly as string[]).map((t: string) => `[This month] ${t}`),
      ...(goals.weekly as string[]).map((t: string) => `[This week] ${t}`),
    ];

    const recentDaily = (reports.daily as { date: string; responses: unknown }[])
      .slice(0, 5)
      .map((r) => reportToText(r.responses))
      .join("\n\n");

    const count = args.count ?? 5;
    const dreamsContext = dreamLines.length
      ? `User's life dreams:\n${dreamLines.join("\n")}`
      : "";
    const goalsContext = goalLines.length
      ? `User's current active goals (incomplete only):\n${goalLines.join("\n")}`
      : "";
    const reportsContext = recentDaily ? `Recent daily context:\n${recentDaily}` : "";
    const userContent = [dreamsContext, goalsContext, reportsContext].filter(Boolean).join("\n\n")
      || "No dreams or goals set yet. Generate general positive affirmations.";

    const styleInstructions = affirmationStylePrompt(
      styles.affirmationStyle,
      styles.affirmationCustomInstructions
    );

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a life coach creating deeply personal affirmations rooted in the user's actual dreams and current goals.

STYLE INSTRUCTIONS — follow these exactly when writing each affirmation:
${styleInstructions}

Rules that always apply:
- Root every affirmation in one of the user's stated dreams or current active goals — don't invent new ones
- Prioritize big life dreams; use current goals when they are vision-worthy
- Write as though the dream or goal is already fully realized
- Make them specific and personal, not generic
- Generate exactly ${count} affirmations

Respond with this exact JSON: {"affirmations": ["...", ...]}`,
        },
        { role: "user", content: userContent },
      ],
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content ?? '{"affirmations":[]}';
    try {
      const parsed = JSON.parse(raw);
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
    await ctx.runMutation(internal.rateLimits.checkAndConsume, { userId: args.userId, action: "insightsChat" });
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

RESPONSE FORMATTING RULES for the "message" field:
- Use ## for section headers (e.g. ## Strengths, ## Areas to Improve, ## Recommendation)
- Use bullet points (- ) for lists — never write long paragraph lists
- Keep paragraphs to 2 sentences max; break the rest into bullets
- Bold (**text**) key numbers, percentages, and pivotal insights
- Use a short opening sentence, then structured sections below it
- Never output a wall of paragraph text

RESPONSE FORMAT: Always respond with valid JSON in this exact shape:
{
  "message": "<your structured markdown response>",
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

export const analyzeProblemResolution = action({
  args: { userId: v.id("users") },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: async (ctx, args): Promise<{ analyzed: number }> => {
    const reports = await ctx.runQuery(internal.problems.getReportsForAnalysis, {
      userId: args.userId,
    });

    if (reports.length === 0) return { analyzed: 0 };

    // Extract unique problems (oldest first)
    type ProblemEntry = { title: string; solutions: string; firstSeen: string };
    const problemMap = new Map<string, ProblemEntry>();

    const sortedReports = [...reports].sort(
      (a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date)
    );

    for (const report of sortedReports) {
      const responses = report.responses as Record<string, unknown>;
      if (!Array.isArray(responses?.problemsToSolve)) continue;
      for (const p of responses.problemsToSolve as Array<{ title: string; solutions: string }>) {
        if (!p.title?.trim()) continue;
        const key = p.title.trim().toLowerCase();
        if (!problemMap.has(key)) {
          problemMap.set(key, {
            title: p.title.trim(),
            solutions: p.solutions || "",
            firstSeen: report.date,
          });
        }
      }
    }

    if (problemMap.size === 0) return { analyzed: 0 };

    const problems = Array.from(problemMap.values());

    // Build resolution context from recent reports
    const contextLines: string[] = [];
    for (const report of reports) {
      const responses = report.responses as Record<string, unknown>;
      const solved = Array.isArray(responses?.problemsSolvedToday)
        ? (responses.problemsSolvedToday as string[]).filter(Boolean).join("; ")
        : "";
      const plan = typeof responses?.tomorrowPlan === "string" ? responses.tomorrowPlan : "";
      if (solved || plan) {
        contextLines.push(
          `${report.date}:\n  Solved today: ${solved || "none"}\n  Tomorrow's plan: ${plan || "none"}`
        );
      }
    }

    const openai = getOpenAI();
    let results: Array<{ problemTitle: string; aiResolved: boolean; aiEvidence: string }> = [];

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are analyzing an accountability tracker to determine if problems have been resolved.
You'll receive a list of problems the user identified, and their daily reports showing what they solved and planned.
For each problem, determine if it was likely resolved based on explicit mentions or strong contextual evidence.

Respond with this exact JSON:
{
  "results": [
    {
      "problemTitle": "<exact problem title as given>",
      "aiResolved": true | false,
      "aiEvidence": "<1-2 sentence explanation citing specific evidence from the reports>"
    }
  ]
}`,
          },
          {
            role: "user",
            content: `Problems to analyze:\n${problems
              .map(
                (p, i) =>
                  `${i + 1}. "${p.title}" (first seen: ${p.firstSeen})\n   Proposed solutions: ${p.solutions || "none"}`
              )
              .join("\n")}\n\n---\n\nReport history (what was solved + tomorrow's plans):\n${
              contextLines.join("\n\n") || "No resolution data found in reports."
            }`,
          },
        ],
        max_tokens: 2000,
        response_format: { type: "json_object" },
      });

      const raw =
        completion.choices[0].message.content ?? '{"results":[]}';
      const parsed = JSON.parse(raw);
      results = parsed.results ?? [];
    } catch (err) {
      console.error("analyzeProblemResolution failed:", err);
      return { analyzed: 0 };
    }

    if (results.length > 0) {
      await ctx.runMutation(internal.problems.saveAnalysisResults, {
        userId: args.userId,
        results,
      });
    }

    return { analyzed: results.length };
  },
});

export const generateOnboardingAffirmations = action({
  args: {
    userId: v.id("users"),
    bio: v.string(),
    dreams: v.object({
      financial: v.optional(v.string()),
      health: v.optional(v.string()),
      relationships: v.optional(v.string()),
      other: v.optional(v.string()),
    }),
    yearlyGoal: v.string(),
  },
  handler: async (ctx, args) => {
    const dreamLines = Object.entries(args.dreams)
      .filter(([, v]) => v?.trim())
      .map(([cat, v]) => `- [${cat}] ${v}`);

    const context = [
      args.bio ? `About me: ${args.bio}` : "",
      dreamLines.length ? `My dreams:\n${dreamLines.join("\n")}` : "",
      args.yearlyGoal ? `This year's focus: ${args.yearlyGoal}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a life coach creating deeply personal affirmations for someone just starting their accountability journey.

Each affirmation MUST follow this exact pattern:
"I am so happy and grateful that I am [restate the dream as a present reality]"

Rules:
- Root every affirmation directly in one of the user's stated dreams — don't invent new goals
- Write as though the dream is already fully realized
- Keep each to one sentence, specific and joyful
- Generate exactly 5 affirmations

Respond with this exact JSON: {"affirmations": ["I am so happy and grateful that I am ...", ...]}`,
        },
        { role: "user", content: context || "Generate 5 powerful positive affirmations." },
      ],
      max_tokens: 400,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content ?? '{"affirmations":[]}';
    let affirmations: string[] = [];
    try {
      const parsed = JSON.parse(raw);
      affirmations = Array.isArray(parsed) ? parsed : (parsed.affirmations ?? []);
    } catch {
      affirmations = [];
    }

    for (const text of affirmations) {
      if (text?.trim()) {
        await ctx.runMutation(internal.affirmations.internalAdd, {
          userId: args.userId,
          text: text.trim(),
          source: "ai",
        });
      }
    }

    return affirmations;
  },
});

async function doGenerateVisualizations(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  userId: string,
  date: string,
  force: boolean
) {
  if (!force) {
    const existing = await ctx.runQuery(internal.aiInternal.getVisualizationForDate, {
      userId,
      date,
    });
    if (existing) return;
  }

  const [goals, problems, styles] = await Promise.all([
    ctx.runQuery(internal.aiInternal.getGoalsForVisualization, { userId }),
    ctx.runQuery(internal.aiInternal.getProblemsForVisualization, { userId }),
    ctx.runQuery(internal.aiInternal.getUserStyles, { userId }),
  ]);

  const contextParts: string[] = [];

  const dreamsMap = goals.dreams as Record<string, string[]>;
  const dreamLines: string[] = [];
  const categoryLabels: Record<string, string> = {
    financial: "Financial dream",
    health: "Health dream",
    relationships: "Relationships dream",
    other: "Dream",
  };
  for (const [cat, titles] of Object.entries(dreamsMap)) {
    for (const t of titles) dreamLines.push(`- [${categoryLabels[cat]}] ${t}`);
  }
  if (dreamLines.length) contextParts.push(`Life dreams:\n${dreamLines.join("\n")}`);

  const goalLines = [
    ...(goals.yearly as string[]).map((t) => `- [this year] ${t}`),
    ...(goals.monthly as string[]).map((t) => `- [this month] ${t}`),
    ...(goals.weekly as string[]).map((t) => `- [this week] ${t}`),
  ];
  if (goalLines.length) contextParts.push(`Current goals:\n${goalLines.join("\n")}`);

  if ((problems as string[]).length)
    contextParts.push(
      `Current challenges to overcome:\n${(problems as string[]).map((p) => `- ${p}`).join("\n")}`
    );

  const vizStyleInstructions = visualizationStylePrompt(
    styles.visualizationStyle,
    styles.visualizationCustomInstructions
  );

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are creating intensely personal 60-second visualization scenarios for a daily mental rehearsal practice.

STYLE INSTRUCTIONS — follow these exactly for every scenario:
${vizStyleInstructions}

Rules that always apply:
- Draw directly from the user's actual dreams, goals, or problems — not generic positivity
- Frame problems as the moment they are fully solved (not the struggle)
- Cover a mix of their dreams AND problems across the 10 scenarios
- Each scenario title should be short and evocative (4–6 words)
- Generate exactly 10 scenarios

Respond with exactly this JSON:
{
  "scenarios": [
    { "title": "Short evocative title (4-6 words)", "description": "3-4 sentence scene." }
  ]
}`,
      },
      {
        role: "user",
        content: contextParts.length
          ? contextParts.join("\n\n")
          : "No dreams set yet. Generate 10 sensory-immersive success visualization scenarios for someone building their ideal life.",
      },
    ],
    max_tokens: 2500,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0].message.content ?? '{"scenarios":[]}';
  let scenarios: { title: string; description: string }[] = [];
  try {
    const parsed = JSON.parse(raw);
    scenarios = parsed.scenarios ?? [];
  } catch {
    scenarios = [];
  }

  if (scenarios.length === 0) return;

  await ctx.runMutation(internal.aiInternal.saveVisualizationScenarios, {
    userId,
    date,
    scenarios: scenarios.slice(0, 10),
  });
}

export const regenerateWeeklyInsight = action({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    await ctx.runMutation(internal.rateLimits.checkAndConsume, { userId: args.userId, action: "regenerateWeeklyInsight" });
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now);
    monday.setDate(diff);
    const weekStartDate = monday.toISOString().split("T")[0];
    await ctx.runAction(internal.ai.generateWeeklyInsight, { userId: args.userId, weekStartDate });
  },
});

export const generateVisualizations = action({
  args: { userId: v.id("users"), force: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.rateLimits.checkAndConsume, { userId: args.userId, action: "generateVisualizations" });
    const today = new Date().toISOString().split("T")[0];
    await doGenerateVisualizations(ctx, args.userId, today, args.force ?? false);
  },
});

export const generateInspirations = action({
  args: { userId: v.id("users"), force: v.optional(v.boolean()) },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: async (ctx, args): Promise<any> => {
    const today = new Date().toISOString().split("T")[0];

    if (!args.force) {
      const existing = await ctx.runQuery(internal.aiInternal.getInspirationForDate, {
        userId: args.userId,
        date: today,
      });
      if (existing) return existing.stories;
    } else {
      await ctx.runMutation(internal.rateLimits.checkAndConsume, {
        userId: args.userId,
        action: "inspiration",
      });
    }

    const [reports, goals, problems] = await Promise.all([
      ctx.runQuery(internal.aiInternal.getRecentReportsForInsights, { userId: args.userId }),
      ctx.runQuery(internal.aiInternal.getGoalsForVisualization, { userId: args.userId }),
      ctx.runQuery(internal.aiInternal.getProblemsForVisualization, { userId: args.userId }),
    ]);

    const contextParts: string[] = [];

    const dreamsMap = goals.dreams as Record<string, string[]>;
    const dreamLines: string[] = [];
    for (const [cat, titles] of Object.entries(dreamsMap)) {
      for (const t of titles) dreamLines.push(`- [${cat}] ${t}`);
    }
    if (dreamLines.length) contextParts.push(`Life dreams:\n${dreamLines.join("\n")}`);

    const goalLines = [
      ...(goals.yearly as string[]).map((t) => `- [yearly] ${t}`),
      ...(goals.monthly as string[]).map((t) => `- [monthly] ${t}`),
      ...(goals.weekly as string[]).map((t) => `- [weekly] ${t}`),
    ];
    if (goalLines.length) contextParts.push(`Active goals:\n${goalLines.join("\n")}`);

    if ((problems as string[]).length) {
      contextParts.push(`Current challenges:\n${(problems as string[]).map((p) => `- ${p}`).join("\n")}`);
    }

    const recentDailyText = (reports.daily as { date: string; responses: unknown }[])
      .slice(0, 10)
      .map((r) => {
        const res = r.responses as Record<string, unknown>;
        const parts: string[] = [];
        if (typeof res?.emotionalDrain === "string" && res.emotionalDrain.trim()) {
          parts.push(`emotional drain: ${res.emotionalDrain}`);
        }
        if (typeof res?.dayActivity === "string" && res.dayActivity.trim()) {
          parts.push(`activity: ${res.dayActivity.slice(0, 120)}`);
        }
        return parts.length ? `[${r.date}] ${parts.join(" | ")}` : null;
      })
      .filter(Boolean)
      .join("\n");
    if (recentDailyText) contextParts.push(`Recent patterns:\n${recentDailyText}`);

    const userContext = contextParts.join("\n\n") || "No data yet — generate general Napoleon Hill wisdom stories.";

    const PRINCIPLES = [
      "Definiteness of Purpose",
      "The Master Mind",
      "Applied Faith",
      "Going the Extra Mile",
      "Personal Initiative",
      "Positive Mental Attitude",
      "Self-Discipline",
      "Accurate Thinking",
      "Creative Vision",
      "Learning from Adversity and Defeat",
      "Enthusiasm",
      "Controlled Attention",
      "Organized Planning",
      "Decision",
    ];

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a master storyteller channeling the wisdom of Napoleon Hill.

Generate exactly 5 short allegorical stories (180–220 words each). Each story must:
1. Feature a vivid, timeless fictional protagonist in a specific, concrete setting
2. Embody ONE distinct Napoleon Hill principle (choose 5 different ones from the list)
3. Subtly mirror the user's real patterns, challenges, or dreams WITHOUT naming them directly — weave them in allegorically
4. Reach a wise, earned resolution with a clear takeaway lesson
5. Feel timeless — like a fable from a great mentor

Available principles: ${PRINCIPLES.join(", ")}

USER CONTEXT (use this to personalize the stories):
${userContext}

STYLE: Evocative, direct, rich with sensory detail. No platitudes — every sentence must earn its place. The story should make the reader feel seen and moved.

Respond with this exact JSON:
{
  "stories": [
    {
      "title": "Short evocative title (4–6 words)",
      "principle": "The Napoleon Hill principle",
      "story": "The full allegorical story (180–220 words)"
    }
  ]
}`,
        },
        { role: "user", content: "Generate today's 5 wisdom stories." },
      ],
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0].message.content ?? '{"stories":[]}';
    let stories: { title: string; principle: string; story: string }[] = [];
    try {
      const parsed = JSON.parse(raw);
      stories = parsed.stories ?? [];
    } catch {
      stories = [];
    }

    if (stories.length > 0) {
      await ctx.runMutation(internal.aiInternal.saveInspiration, {
        userId: args.userId,
        date: today,
        stories: stories.slice(0, 5),
      });
    }

    return stories;
  },
});

export const generateVisualizationsInternal = internalAction({
  args: { userId: v.id("users"), date: v.string() },
  handler: async (ctx, args) => {
    await doGenerateVisualizations(ctx, args.userId, args.date, false);
  },
});

export const chat = action({
  args: {
    userId: v.id("users"),
    message: v.string(),
    history: v.array(v.object({ role: v.string(), content: v.string() })),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.rateLimits.checkAndConsume, { userId: args.userId, action: "chat" });
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
