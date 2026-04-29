import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    auth0Sub: v.string(),
    email: v.string(),
    name: v.string(),
    timezone: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_auth0_sub", ["auth0Sub"]),

  dailyReports: defineTable({
    userId: v.id("users"),
    date: v.string(),
    responses: v.any(),
    embedding: v.optional(v.array(v.float64())),
    submittedAt: v.number(),
  })
    .index("by_user_date", ["userId", "date"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId"],
    }),

  weeklyReports: defineTable({
    userId: v.id("users"),
    weekStartDate: v.string(),
    responses: v.any(),
    embedding: v.optional(v.array(v.float64())),
    submittedAt: v.number(),
  })
    .index("by_user_week", ["userId", "weekStartDate"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId"],
    }),

  pushSubscriptions: defineTable({
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  sentNotifications: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("daily"), v.literal("weekly")),
    date: v.string(),
  }).index("by_user_type_date", ["userId", "type", "date"]),

  aiInsights: defineTable({
    userId: v.id("users"),
    weekStartDate: v.string(),
    content: v.string(),
    generatedAt: v.number(),
  }).index("by_user_week", ["userId", "weekStartDate"]),

  goals: defineTable({
    userId: v.id("users"),
    category: v.union(
      v.literal("lifelong"),
      v.literal("yearly"),
      v.literal("quarterly"),
      v.literal("monthly"),
      v.literal("weekly")
    ),
    // "all" | "2026" | "2026-Q2" | "2026-04" | "2026-04-28"
    periodKey: v.string(),
    title: v.string(),
    completed: v.boolean(),
    createdAt: v.number(),
  }).index("by_user_category_period", ["userId", "category", "periodKey"]),
});
