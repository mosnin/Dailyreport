import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertOwner(ctx: any, userId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  if (!user || user.clerkId !== identity.subject) throw new Error("Unauthorized");
}

const SOURCE = v.union(v.literal("manual"), v.literal("clickup"), v.literal("trello"));

export const list = query({
  args: { userId: v.id("users"), includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return [];
    const rows = await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const filtered = args.includeArchived ? rows : rows.filter((r) => !r.archived);
    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;
    const user = await ctx.db.get(project.userId);
    if (!user || user.clerkId !== identity.subject) return null;
    const updates = await ctx.db
      .query("projectUpdates")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    return { project, updates: updates.sort((a, b) => a.date.localeCompare(b.date)) };
  },
});

export const create = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    progress: v.optional(v.number()),
    linkedGoalId: v.optional(v.id("goals")),
    color: v.optional(v.string()),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx, args.userId);
    const now = Date.now();
    return ctx.db.insert("projects", {
      userId: args.userId,
      title: args.title,
      description: args.description,
      source: "manual",
      status: args.status ?? "active",
      progress: args.progress ?? 0,
      linkedGoalId: args.linkedGoalId,
      color: args.color,
      dueDate: args.dueDate,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    progress: v.optional(v.number()),
    linkedGoalId: v.optional(v.id("goals")),
    color: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    archived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return;
    await assertOwner(ctx, project.userId);
    const { projectId, ...patch } = args;
    const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    await ctx.db.patch(projectId, { ...clean, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return;
    await assertOwner(ctx, project.userId);
    const updates = await ctx.db
      .query("projectUpdates")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const u of updates) await ctx.db.delete(u._id);
    await ctx.db.delete(args.projectId);
  },
});

// Project progress report — log an update and advance project progress
export const addUpdate = mutation({
  args: {
    userId: v.id("users"),
    projectId: v.id("projects"),
    date: v.string(),
    progress: v.number(),
    hoursSpent: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx, args.userId);
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== args.userId) throw new Error("Forbidden");
    const id = await ctx.db.insert("projectUpdates", {
      userId: args.userId,
      projectId: args.projectId,
      date: args.date,
      progress: args.progress,
      hoursSpent: args.hoursSpent,
      note: args.note,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.projectId, {
      progress: args.progress,
      status: args.progress >= 100 ? "done" : project.status,
      updatedAt: Date.now(),
    });
    return id;
  },
});

export const recentUpdates = query({
  args: { userId: v.id("users"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) return [];
    const days = Math.min(args.days ?? 30, 180);
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().split("T")[0];
    const rows = await ctx.db
      .query("projectUpdates")
      .withIndex("by_user_date", (q) => q.eq("userId", args.userId).gte("date", cutoff))
      .collect();
    return rows.sort((a, b) => b.date.localeCompare(a.date));
  },
});

// Upsert projects synced from ClickUp / Trello (called after the connector fetch)
export const syncFromConnector = mutation({
  args: {
    userId: v.id("users"),
    source: SOURCE,
    projects: v.array(
      v.object({
        externalId: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        status: v.optional(v.string()),
        progress: v.optional(v.number()),
        externalUrl: v.optional(v.string()),
        dueDate: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await assertOwner(ctx, args.userId);
    const now = Date.now();
    let created = 0;
    let updated = 0;
    for (const p of args.projects.slice(0, 100)) {
      const existing = await ctx.db
        .query("projects")
        .withIndex("by_user_external", (q) =>
          q.eq("userId", args.userId).eq("externalId", p.externalId)
        )
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          title: p.title,
          description: p.description ?? existing.description,
          status: p.status ?? existing.status,
          progress: typeof p.progress === "number" ? p.progress : existing.progress,
          externalUrl: p.externalUrl ?? existing.externalUrl,
          dueDate: p.dueDate ?? existing.dueDate,
          lastSynced: now,
          updatedAt: now,
        });
        updated++;
      } else {
        await ctx.db.insert("projects", {
          userId: args.userId,
          title: p.title,
          description: p.description,
          source: args.source,
          externalId: p.externalId,
          externalUrl: p.externalUrl,
          status: p.status ?? "active",
          progress: typeof p.progress === "number" ? p.progress : 0,
          dueDate: p.dueDate,
          lastSynced: now,
          createdAt: now,
          updatedAt: now,
        });
        created++;
      }
    }
    return { created, updated };
  },
});
