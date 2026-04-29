# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Next.js 14 App Router accountability app. Users fill in daily and weekly reports, receive PWA push notifications at their local 8pm (per-user IANA timezone), and explore their history via a dashboard, calendar, semantic search, AI chat, AI insights with charts, goals tracker, and affirmations flashcards.

## Commands

```bash
# Development — run both simultaneously
npm run dev            # Next.js on port 3000
npx convex dev         # Convex backend (localhost:3210); auto-regenerates types on file save

# After adding/modifying any convex/*.ts file
npx convex dev --once  # One-shot codegen without staying alive

# Type check (run before committing)
npx tsc --noEmit

# Deploy Convex backend to production
npx convex deploy

# Set a Convex environment variable (server-side secrets)
npx convex env set OPENAI_API_KEY sk-...
```

## Architecture

```
Browser (PWA)
  ├── Next.js App Router (Vercel)
  │   ├── Auth0 v4 middleware — handles /auth/* routes automatically
  │   └── /api/auth/token — exposes Auth0 ID token for Convex auth
  ├── ConvexWithAuth0Provider — fetches token, passes to ConvexProviderWithAuth
  └── public/sw.js — service worker (push + offline cache)

Convex (backend)
  ├── convex/schema.ts — single source of truth for all tables
  ├── convex/ai.ts ("use node") — OpenAI actions: embed, chat, insights, affirmation generation
  ├── convex/aiInternal.ts — queries/mutations called by ai.ts (cannot be in ai.ts)
  ├── convex/pushNotifications.ts ("use node") — web-push send action
  ├── convex/pushSubscriptions.ts — public mutations/queries for subscriptions
  ├── convex/crons.ts — hourly notification cron + Monday insight cron
  └── convex/{reports,users,goals,affirmations}.ts — domain functions

OpenAI
  ├── text-embedding-3-small (1536 dims) — embedded into report records on submit
  └── gpt-4o (json_object mode) — insightsChat, generateAffirmations, chat, weeklyInsight
```

## Convex File-Split Rule

Files with `"use node"` at the top **cannot** export `query`, `mutation`, `internalQuery`, or `internalMutation`. Any Convex-runtime function that a node action needs must live in a separate file and be called via `ctx.runQuery` / `ctx.runMutation`.

Current split:
- `ai.ts` — node actions only (`embedDailyReport`, `embedWeeklyReport`, `generateWeeklyInsight`, `generateAffirmations`, `semanticSearch`, `insightsChat`, `chat`)
- `aiInternal.ts` — queries/mutations called by ai.ts (`getDailyReportInternal`, `getWeeklyReportInternal`, `patchDailyEmbedding`, `patchWeeklyEmbedding`, `getWeekReportsForInsight`, `getRecentReportsForInsights`, `saveInsight`, `getLatestInsight`)
- `pushNotifications.ts` — node action only (`sendPushToUser`)
- `pushSubscriptions.ts` — public mutations/queries

## Convex Schema Tables

| Table | Key fields | Index |
|---|---|---|
| `users` | `auth0Sub`, `email`, `name`, `timezone?`, `createdAt` | `by_auth0_sub` |
| `dailyReports` | `userId`, `date` (yyyy-MM-dd), `responses: any`, `embedding?` | `by_user_date`, vectorIndex `by_embedding` |
| `weeklyReports` | `userId`, `weekStartDate` (Monday yyyy-MM-dd), `responses: any`, `embedding?` | `by_user_week`, vectorIndex `by_embedding` |
| `goals` | `userId`, `category`, `periodKey`, `title`, `completed` | `by_user_category_period` |
| `affirmations` | `userId`, `text`, `source: "manual"\|"ai"` | `by_user` |
| `aiInsights` | `userId`, `weekStartDate`, `content` | `by_user_week` |
| `pushSubscriptions` | `userId`, `endpoint`, `p256dh`, `auth` | `by_user` |
| `sentNotifications` | `userId`, `type: "daily"\|"weekly"`, `date` | `by_user_type_date` |

After any schema change, run `npx convex dev --once` and **also manually update** `convex/_generated/api.d.ts` to add the new module import and `fullApi` entry — the local dev server is not always running in CI.

## Auth Flow

1. `middleware.ts` — Auth0 v4 handles all `/auth/*` routes automatically (no route handler needed)
2. `lib/auth0.ts` — `beforeSessionSaved` hook persists the Auth0 ID token into `session.tokenSet.idToken`
3. `app/api/auth/token/route.ts` — GET endpoint returns `session.tokenSet.idToken` to the browser
4. `components/ConvexWithAuth0Provider.tsx` — polls `/api/auth/token`, passes to `ConvexProviderWithAuth`
5. `convex/auth.config.ts` — validates token against Auth0 JWKS; uses `AUTH0_DOMAIN` (just the domain, no `https://`)
6. On first load: `api.users.getOrCreate` upserts the Convex user record keyed on `auth0Sub`

## Required Environment Variables

**.env.local** (Next.js):
```
AUTH0_DOMAIN=yourapp.us.auth0.com   # No https://
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_SECRET=                        # random 32+ char string
AUTH0_BASE_URL=http://localhost:3000
NEXT_PUBLIC_CONVEX_URL=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
```

**Convex dashboard** (server-side only, set with `npx convex env set`):
```
OPENAI_API_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:you@example.com
AUTH0_DOMAIN=yourapp.us.auth0.com
```

Auth0 dashboard: register `{APP_URL}/auth/callback` as Allowed Callback URL.

## Goals Period Key System

Goals are scoped by `category` + `periodKey`. The `currentPeriodKey(category)` helper in `lib/utils.ts` generates the correct key:

| Category | periodKey format | Example |
|---|---|---|
| `lifelong` | `"all"` | `"all"` |
| `yearly` | `"YYYY"` | `"2026"` |
| `quarterly` | `"YYYY-QN"` | `"2026-Q2"` |
| `monthly` | `"YYYY-MM"` | `"2026-04"` |
| `weekly` | `"YYYY-MM-DD"` (Monday) | `"2026-04-28"` |

## Report Response Types

`DailyReportResponses` (from `components/reports/DailyReportForm.tsx`):
```ts
{
  dayActivity: string;
  peopleMetToday: { id, name, goalRelated: boolean|null, notes }[];
  dailyGoals: string[];
  emotionalDrain: string;
  problemsToSolve: { id, title, solutions }[];
  problemsSolvedToday: string[];
  didAffirmations: boolean | null;
  tomorrowPlan: string;
}
```
Stored as `responses: v.any()` in Convex. `WeeklyReportResponses` mirrors this with weekly-scoped field names.

## AI Insights / insightsChat

`convex/ai.ts` → `insightsChat` action fetches the last 30 daily + 12 weekly reports, builds a context string, and calls GPT-4o with `response_format: { type: "json_object" }`. The response shape is:
```ts
{ message: string; chart: ChartSpec | null }
```
`ChartSpec` (from `components/insights/ChartBlock.tsx`) drives Recharts rendering: `type: "bar"|"line"|"pie"|"radar"` with type-appropriate data/key fields.

## Push Notification Flow

1. User clicks "Enable" on dashboard banner → `hooks/usePushSubscription.ts` → `Notification.requestPermission()` → `pushManager.subscribe()` → stored via `api.pushSubscriptions.saveSubscription`
2. Convex hourly cron (`crons.ts`) → for each user, checks if local time is 20:xx using `toLocaleString` with their IANA timezone → if yes and not already sent today → calls `internal.pushNotifications.sendPushToUser` → inserts `sentNotifications` record

VAPID keys for local dev are in `.env.local`. Regenerate for production:
```bash
node -e "const wp=require('web-push'); console.log(wp.generateVAPIDKeys())"
```

## Route Structure

| Route | Description |
|---|---|
| `/` | Landing page (redirects to /dashboard if logged in) |
| `/dashboard` | Stats bar (streak, accuracy), calendar heatmap, AI insight card, push prompt |
| `/reports/daily` | 7-question daily form; pre-fills if already submitted today |
| `/reports/weekly` | Same 7-question structure, scoped to the current week |
| `/goals` | 5 time-scoped goal categories with inline add/edit/toggle |
| `/affirmations` | Add/edit/delete affirmations; AI-generate 5 from reports; flashcard mode |
| `/insights` | AI chat that auto-analyzes reports on load; returns markdown + optional Recharts chart |
| `/calendar` | Full calendar with clickable past days to view report inline |
| `/search` | Semantic search over all report history via vector search |
| `/chat` | RAG chat: embeds message, retrieves top-k reports, GPT-4o responds |
| `/settings` | Timezone picker, push notification toggle, account info, sign-out |

## shadcn/ui Notes

This project uses shadcn/ui v4 with Tailwind v4. The primitives do **not** support `asChild` — use plain `<Link className="...">` instead of `<Button asChild><Link>`.

## Development Branch Convention

Active development happens on feature branches. Always open a draft PR after pushing a new branch:
```bash
git push -u origin <branch-name>
```
