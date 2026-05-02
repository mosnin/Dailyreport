import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const createJob = mutation({
  args: {
    userId: v.id("users"),
    intent: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user || user._id !== args.userId) throw new Error("Forbidden");

    return ctx.db.insert("agentJobs", {
      userId: args.userId,
      intent: args.intent,
      status: "queued",
      progressLog: [],
      createdAt: Date.now(),
    });
  },
});

export const appendProgress = mutation({
  args: {
    jobId: v.id("agentJobs"),
    text: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.jobId);
    if (!job) return;

    const current = job.progressLog;
    await ctx.db.patch(args.jobId, {
      progressLog: [...current, { ts: Date.now(), text: args.text }],
      status: job.status === "queued" ? "running" : job.status,
    });
  },
});

export const completeJob = mutation({
  args: {
    jobId: v.id("agentJobs"),
    result: v.optional(v.any()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "done",
      result: args.result,
      completedAt: Date.now(),
    });
  },
});

export const failJob = mutation({
  args: {
    jobId: v.id("agentJobs"),
    error: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "failed",
      error: args.error,
      completedAt: Date.now(),
    });
  },
});

export const getJob = query({
  args: { jobId: v.id("agentJobs") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.jobId);
  },
});

export const listRecentJobs = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("agentJobs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(20);
  },
});

// Called by server-side actions (no user auth context)
export const failJobInternal = internalMutation({
  args: {
    jobId: v.id("agentJobs"),
    error: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      status: "failed",
      error: args.error,
      completedAt: Date.now(),
    });
  },
});

export const createJobInternal = internalMutation({
  args: {
    userId: v.id("users"),
    intent: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("agentJobs", {
      userId: args.userId,
      intent: args.intent,
      status: "queued",
      progressLog: [],
      createdAt: Date.now(),
    });
  },
});
