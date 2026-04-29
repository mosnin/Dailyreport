import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    timezone: v.optional(v.string()),
    bio: v.optional(v.string()),
    onboardingComplete: v.optional(v.boolean()),
    lifelongMigrated: v.optional(v.boolean()),
    affirmationStyle: v.optional(v.string()),
    affirmationCustomInstructions: v.optional(v.string()),
    visualizationStyle: v.optional(v.string()),
    visualizationCustomInstructions: v.optional(v.string()),
    role: v.optional(v.union(v.literal("user"), v.literal("admin"))),
    plan: v.optional(v.union(v.literal("free"), v.literal("pro"), v.literal("unlimited"))),
    creemCustomerId: v.optional(v.string()),
    creemSubscriptionId: v.optional(v.string()),
    planUpdatedAt: v.optional(v.number()),
    emailOptOut: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_creem_subscription", ["creemSubscriptionId"]),

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
    type: v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("email_digest"),
      v.literal("email_reminder")
    ),
    date: v.string(),
  }).index("by_user_type_date", ["userId", "type", "date"]),

  aiInsights: defineTable({
    userId: v.id("users"),
    weekStartDate: v.string(),
    content: v.string(),
    generatedAt: v.number(),
  }).index("by_user_week", ["userId", "weekStartDate"]),

  affirmations: defineTable({
    userId: v.id("users"),
    text: v.string(),
    source: v.union(v.literal("manual"), v.literal("ai"), v.literal("saved")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  problemStatuses: defineTable({
    userId: v.id("users"),
    problemTitle: v.string(),
    solvedManually: v.optional(v.boolean()),
    aiResolved: v.optional(v.boolean()),
    aiEvidence: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_title", ["userId", "problemTitle"]),

  affirmationSessions: defineTable({
    userId: v.id("users"),
    date: v.string(),
    rounds: v.number(),
  }).index("by_user_date", ["userId", "date"]),

  visualizations: defineTable({
    userId: v.id("users"),
    date: v.string(),
    scenarios: v.array(
      v.object({ title: v.string(), description: v.string() })
    ),
    completedIndexes: v.array(v.number()),
    generatedAt: v.number(),
  }).index("by_user_date", ["userId", "date"]),

  goals: defineTable({
    userId: v.id("users"),
    category: v.union(
      v.literal("lifelong"), // kept for backwards compat with existing data; UI no longer creates these
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

  dreams: defineTable({
    userId: v.id("users"),
    category: v.union(
      v.literal("financial"),
      v.literal("health"),
      v.literal("relationships"),
      v.literal("other")
    ),
    title: v.string(),
    createdAt: v.number(),
  }).index("by_user_category", ["userId", "category"]),

  rateLimitUsage: defineTable({
    userId: v.id("users"),
    action: v.string(),
    date: v.string(),
    count: v.number(),
  }).index("by_user_action_date", ["userId", "action", "date"]),
});
