import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const PLATFORM = v.union(
  v.literal("slack"),
  v.literal("notion"),
  v.literal("clickup"),
  v.literal("trello"),
  v.literal("asana")
);

const TASK_OBJECT = v.object({
  platform: PLATFORM,
  externalId: v.string(),
  title: v.string(),
  status: v.string(),
  dueDate: v.optional(v.string()),
  url: v.optional(v.string()),
  priority: v.optional(v.string()),
  completed: v.boolean(),
});

export const syncTasks = mutation({
  args: {
    userId: v.id("users"),
    tasks: v.array(TASK_OBJECT),
  },
  handler: async (ctx, args) => {
    const tasks = args.tasks.slice(0, 100);
    for (const task of tasks) {
      const existing = await ctx.db
        .query("externalTasks")
        .withIndex("by_user_external", (q) =>
          q.eq("userId", args.userId).eq("externalId", task.externalId)
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          platform: task.platform,
          title: task.title,
          status: task.status,
          dueDate: task.dueDate,
          url: task.url,
          priority: task.priority,
          completed: task.completed,
          lastSynced: Date.now(),
        });
      } else {
        await ctx.db.insert("externalTasks", {
          userId: args.userId,
          platform: task.platform,
          externalId: task.externalId,
          title: task.title,
          status: task.status,
          dueDate: task.dueDate,
          url: task.url,
          priority: task.priority,
          completed: task.completed,
          lastSynced: Date.now(),
        });
      }
    }
  },
});

export const getTasksByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("externalTasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return tasks.filter((t) => t.completed === false);
  },
});

export const markTaskComplete = mutation({
  args: {
    userId: v.id("users"),
    taskId: v.id("externalTasks"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    if (task.userId !== args.userId) throw new Error("Forbidden");

    await ctx.db.patch(args.taskId, { completed: true });
  },
});
