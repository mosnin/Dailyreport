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
      v.literal("email_reminder"),
      v.literal("morning_briefing")
    ),
    date: v.string(),
  }).index("by_user_type_date", ["userId", "type", "date"]),

  aiInsights: defineTable({
    userId: v.id("users"),
    weekStartDate: v.string(),
    content: v.string(),
    scores: v.optional(
      v.object({
        momentum: v.number(),   // -100 to 100
        execution: v.number(),  // 0 to 100
        wellbeing: v.number(),  // 0 to 100
        growth: v.number(),     // 0 to 100
      })
    ),
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

  givingEntries: defineTable({
    userId: v.id("users"),
    date: v.string(),
    text: v.string(),
    createdAt: v.number(),
  }).index("by_user_date", ["userId", "date"]),

  inspirations: defineTable({
    userId: v.id("users"),
    date: v.string(),
    stories: v.array(
      v.object({ title: v.string(), principle: v.string(), story: v.string() })
    ),
    generatedAt: v.number(),
  }).index("by_user_date", ["userId", "date"]),

  dailyBriefs: defineTable({
    userId: v.id("users"),
    date: v.string(),
    content: v.string(),
  }).index("by_user_date", ["userId", "date"]),

  energyAnalysis: defineTable({
    userId: v.id("users"),
    analyzedAt: v.number(),
    dayScores: v.array(v.object({ date: v.string(), score: v.number(), keywords: v.array(v.string()) })),
    drainFactors: v.array(v.object({ factor: v.string(), count: v.number() })),
    rechargeFactors: v.array(v.object({ factor: v.string(), count: v.number() })),
  }).index("by_user", ["userId"]),

  weekDrafts: defineTable({
    userId: v.id("users"),
    weekStartDate: v.string(), // Monday yyyy-MM-dd
    bullets: v.array(v.string()), // 3-5 short bullet strings
    generatedAt: v.number(),
  }).index("by_user_week", ["userId", "weekStartDate"]),

  rituals: defineTable({
    userId: v.id("users"),
    title: v.string(),
    order: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  ritualLogs: defineTable({
    userId: v.id("users"),
    date: v.string(),
    completedIds: v.array(v.string()),
  }).index("by_user_date", ["userId", "date"]),

  integrations: defineTable({
    userId: v.id("users"),
    platform: v.union(
      v.literal("slack"),
      v.literal("notion"),
      v.literal("clickup"),
      v.literal("trello"),
      v.literal("asana"),
      v.literal("googlecalendar"),
      v.literal("gmail")
    ),
    composioConnectionId: v.string(),
    connected: v.boolean(),
    connectedAt: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_user_platform", ["userId", "platform"]),

  agentJobs: defineTable({
    userId: v.id("users"),
    status: v.union(
      v.literal("queued"),
      v.literal("running"),
      v.literal("done"),
      v.literal("failed")
    ),
    intent: v.string(),
    progressLog: v.array(v.object({ ts: v.number(), text: v.string() })),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  externalTasks: defineTable({
    userId: v.id("users"),
    platform: v.union(
      v.literal("slack"),
      v.literal("notion"),
      v.literal("clickup"),
      v.literal("trello"),
      v.literal("asana")
    ),
    externalId: v.string(),
    title: v.string(),
    status: v.string(),
    dueDate: v.optional(v.string()),
    url: v.optional(v.string()),
    priority: v.optional(v.string()),
    completed: v.boolean(),
    lastSynced: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_platform", ["userId", "platform"])
    .index("by_user_external", ["userId", "externalId"]),

  // ── Life analytics: domain logs ──────────────────────────────────────────

  // Daily health + wellness report (physical + emotional self-care)
  healthLogs: defineTable({
    userId: v.id("users"),
    date: v.string(),
    sleepHours: v.optional(v.number()),
    energy: v.optional(v.number()),       // 1-10
    mood: v.optional(v.number()),         // 1-10
    stress: v.optional(v.number()),       // 1-10 (higher = more stressed)
    exerciseMinutes: v.optional(v.number()),
    exerciseType: v.optional(v.string()),
    nutrition: v.optional(v.number()),    // 1-10 quality
    water: v.optional(v.number()),        // glasses
    weight: v.optional(v.number()),
    gratitude: v.optional(v.string()),
    win: v.optional(v.string()),          // today's win
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user_date", ["userId", "date"]),

  // Finance snapshots
  financeLogs: defineTable({
    userId: v.id("users"),
    date: v.string(),
    income: v.optional(v.number()),
    spending: v.optional(v.number()),
    saved: v.optional(v.number()),
    netWorth: v.optional(v.number()),
    financialStress: v.optional(v.number()), // 1-10 (higher = more stressed)
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user_date", ["userId", "date"]),

  // Education / skill-learning sessions
  educationLogs: defineTable({
    userId: v.id("users"),
    date: v.string(),
    skill: v.string(),
    minutes: v.number(),
    whatLearned: v.optional(v.string()),
    mastery: v.optional(v.number()),       // 0-100 self-rated
    linkedGoalId: v.optional(v.id("goals")),
    linkedGrowthId: v.optional(v.id("growthItems")),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  // Skills to learn + fears to overcome
  growthItems: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("skill"), v.literal("fear")),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("achieved"), v.literal("paused")),
    progress: v.number(),                  // 0-100
    targetDate: v.optional(v.string()),
    linkedGoalId: v.optional(v.id("goals")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "type"]),

  // Projects (manual or synced from ClickUp/Trello) tied to goals
  projects: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    source: v.union(v.literal("manual"), v.literal("clickup"), v.literal("trello")),
    externalId: v.optional(v.string()),
    externalUrl: v.optional(v.string()),
    status: v.string(),                    // planning | active | blocked | done
    progress: v.number(),                  // 0-100
    linkedGoalId: v.optional(v.id("goals")),
    color: v.optional(v.string()),
    dueDate: v.optional(v.string()),
    archived: v.optional(v.boolean()),
    lastSynced: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_external", ["userId", "externalId"])
    .index("by_user_status", ["userId", "status"]),

  // Project progress updates (the "project progress report")
  projectUpdates: defineTable({
    userId: v.id("users"),
    projectId: v.id("projects"),
    date: v.string(),
    progress: v.number(),                  // 0-100 snapshot
    hoursSpent: v.optional(v.number()),
    note: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_project", ["projectId"]),

  // Cached daily snapshots of computed life-area scores (for fast charts)
  lifeScores: defineTable({
    userId: v.id("users"),
    date: v.string(),
    health: v.number(),
    goals: v.number(),
    finance: v.number(),
    emotional: v.number(),
    progress: v.number(),
    execution: v.number(),
    composite: v.number(),
    computedAt: v.number(),
  }).index("by_user_date", ["userId", "date"]),

});
