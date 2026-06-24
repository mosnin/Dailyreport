import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import OpenAI from "openai";

/**
 * Cross-domain AI pattern detection. Pulls a compact snapshot from every life
 * area — scores, health, finances, learning, projects, goals, recent reports —
 * and asks the model to surface non-obvious patterns and correlations the
 * deterministic scoring can't see (e.g. "spending spikes follow low-sleep weeks").
 */
export const analyze = action({
  args: { userId: v.id("users") },
  handler: async (
    ctx,
    { userId }
  ): Promise<{ summary: string; patterns: { title: string; detail: string; area: string }[] }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const [current, series, health, finance, skills, projects, goals, reports] = await Promise.all([
      ctx.runQuery(api.lifeScore.getCurrent, { userId, windowDays: 14 }),
      ctx.runQuery(api.lifeScore.getSeries, { userId, days: 30 }),
      ctx.runQuery(api.health.getRecent, { userId, days: 30 }),
      ctx.runQuery(api.finances.getRecent, { userId, days: 60 }),
      ctx.runQuery(api.education.getSkillSummary, { userId }),
      ctx.runQuery(api.projects.list, { userId }),
      ctx.runQuery(api.goals.getCurrentSummary, { userId }),
      ctx.runQuery(api.reports.getRecentReports, { userId, limit: 10 }),
    ]);

    const scoreLine = current
      ? `Composite ${current.composite}/100 (credit ${current.credit}). Areas: ${current.areas
          .map((a: any) => `${a.key}=${a.needsData ? "n/a" : a.score}${a.needsData ? "" : ` (trend ${a.trend})`}`)
          .join(", ")}.`
      : "No score yet.";

    const healthLine = (health ?? [])
      .slice(-14)
      .map((h: any) => `${h.date}: sleep=${h.sleepHours ?? "-"} mood=${h.mood ?? "-"} energy=${h.energy ?? "-"} stress=${h.stress ?? "-"} exercise=${h.exerciseMinutes ?? "-"}min`)
      .join("\n");

    const financeLine = (finance ?? [])
      .slice(-8)
      .map((f: any) => `${f.date}: income=${f.income ?? "-"} spending=${f.spending ?? "-"} saved=${f.saved ?? "-"} stress=${f.financialStress ?? "-"}`)
      .join("\n");

    const skillsLine = (skills ?? []).map((s: any) => `${s.skill}: ${Math.round(s.totalMinutes / 60)}h over ${s.sessions} sessions`).join("; ");
    const projectsLine = (projects ?? []).filter((p: any) => !p.archived).map((p: any) => `${p.title} (${p.status}, ${p.progress}%)`).join("; ");
    const goalsLine = goals
      ? Object.entries(goals).map(([k, vv]: any) => `${k}: ${vv.completed}/${vv.total}`).join(", ")
      : "none";
    const reportsLine = (reports ?? [])
      .map((r: any) => {
        const resp = r.responses ?? {};
        return `${r.date}: ${(resp.dayActivity ?? "").slice(0, 160)} | drain: ${(resp.emotionalDrain ?? "").slice(0, 100)}`;
      })
      .join("\n");

    const trendLine = (series ?? [])
      .filter((_: any, i: number) => i % 3 === 0)
      .map((d: any) => `${d.date}: comp=${d.composite} h=${d.health} e=${d.emotional} ex=${d.execution} p=${d.progress}`)
      .join("\n");

    const prompt = `You are a sharp life-analytics coach. Below is a snapshot of one person across every tracked area. Find the most useful NON-OBVIOUS patterns and cross-domain correlations (e.g. how sleep affects mood/spending, whether execution tracks with health, which areas are dragging the composite). Be specific and reference the data. Return JSON exactly:
{
  "summary": "<2 sentence overview of where their life stands and the single biggest lever>",
  "patterns": [
    { "title": "<short punchy pattern name>", "detail": "<1-2 sentences, specific, reference data>", "area": "<one of: health, goals, finance, emotional, progress, execution, cross>" }
  ]
}
Return 3-5 patterns. Prefer cross-domain links. If data is thin in an area, you may note it but don't pad.

SCORES: ${scoreLine}

SCORE TREND (every 3rd day, 30d):
${trendLine || "n/a"}

HEALTH (recent):
${healthLine || "n/a"}

FINANCE (recent):
${financeLine || "n/a"}

LEARNING: ${skillsLine || "none"}
PROJECTS: ${projectsLine || "none"}
GOALS (completed/total): ${goalsLine}

RECENT DAILY REPORTS:
${reportsLine || "n/a"}`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You analyze personal life-tracking data and surface precise, actionable patterns. Always return valid JSON." },
          { role: "user", content: prompt },
        ],
      });
      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw);
      return {
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
        patterns: Array.isArray(parsed.patterns)
          ? parsed.patterns.slice(0, 6).map((p: any) => ({
              title: String(p.title ?? "Pattern"),
              detail: String(p.detail ?? ""),
              area: String(p.area ?? "cross"),
            }))
          : [],
      };
    } catch (e) {
      console.error("lifePatterns.analyze failed", e);
      throw new Error("Could not analyze patterns right now.");
    }
  },
});
