import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertOwner(ctx: any, userId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user || user.clerkId !== identity.subject) throw new Error("Unauthorized");
}

// ── Public queries ─────────────────────────────────────────────────────────

export const getAllProblems = query({
  args: { userId: v.id("users") },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: async (ctx, args): Promise<any[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return [];

    const reports = await ctx.db
      .query("dailyReports")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("asc")
      .collect();

    type ProblemEntry = {
      title: string;
      firstSeen: string;
      lastSeen: string;
      solutions: string[];
      occurrences: number;
    };

    const problemMap = new Map<string, ProblemEntry>();

    for (const report of reports) {
      const responses = report.responses as Record<string, unknown>;
      if (!Array.isArray(responses?.problemsToSolve)) continue;

      for (const p of responses.problemsToSolve as Array<{ title: string; solutions: string }>) {
        if (!p.title?.trim()) continue;
        const key = p.title.trim().toLowerCase();

        if (problemMap.has(key)) {
          const existing = problemMap.get(key)!;
          existing.lastSeen = report.date;
          existing.occurrences++;
          if (p.solutions?.trim() && !existing.solutions.includes(p.solutions.trim())) {
            existing.solutions.push(p.solutions.trim());
          }
        } else {
          problemMap.set(key, {
            title: p.title.trim(),
            firstSeen: report.date,
            lastSeen: report.date,
            solutions: p.solutions?.trim() ? [p.solutions.trim()] : [],
            occurrences: 1,
          });
        }
      }
    }

    const statuses = await ctx.db
      .query("problemStatuses")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();

    const statusMap = new Map(statuses.map((s: any) => [s.problemTitle, s]));

    return Array.from(problemMap.values()).map((p) => {
      const status = statusMap.get(p.title.toLowerCase()) as any;
      return {
        ...p,
        solvedManually: status?.solvedManually ?? null,
        aiResolved: status?.aiResolved ?? null,
        aiEvidence: status?.aiEvidence ?? null,
      };
    });
  },
});

// ── Internal queries (called by ai.ts action) ─────────────────────────────

export const getReportsForAnalysis = internalQuery({
  args: { userId: v.id("users") },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: async (ctx, args): Promise<any[]> => {
    const reports = await ctx.db
      .query("dailyReports")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(60);

    return reports.map((r) => ({
      date: r.date,
      responses: r.responses,
    }));
  },
});

// ── Internal mutations (called by ai.ts action) ───────────────────────────

export const saveAnalysisResults = internalMutation({
  args: {
    userId: v.id("users"),
    results: v.array(
      v.object({
        problemTitle: v.string(),
        aiResolved: v.boolean(),
        aiEvidence: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const result of args.results) {
      const key = result.problemTitle.trim().toLowerCase();
      const existing = await ctx.db
        .query("problemStatuses")
        .withIndex("by_user_title", (q) =>
          q.eq("userId", args.userId).eq("problemTitle", key)
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          aiResolved: result.aiResolved,
          aiEvidence: result.aiEvidence,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("problemStatuses", {
          userId: args.userId,
          problemTitle: key,
          aiResolved: result.aiResolved,
          aiEvidence: result.aiEvidence,
          updatedAt: Date.now(),
        });
      }
    }
  },
});

// ── Public mutations ───────────────────────────────────────────────────────

export const setProblemStatus = mutation({
  args: {
    userId: v.id("users"),
    problemTitle: v.string(),
    solvedManually: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx, args.userId);

    const key = args.problemTitle.trim().toLowerCase();
    const existing = await ctx.db
      .query("problemStatuses")
      .withIndex("by_user_title", (q) =>
        q.eq("userId", args.userId).eq("problemTitle", key)
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        solvedManually: args.solvedManually,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("problemStatuses", {
        userId: args.userId,
        problemTitle: key,
        solvedManually: args.solvedManually,
        updatedAt: Date.now(),
      });
    }
  },
});
