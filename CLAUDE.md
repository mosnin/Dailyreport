# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Next.js accountability app where users complete daily (8pm) and weekly (Sunday 8pm) reports, receive PWA push notifications at their local 8pm, and explore their history via a dashboard, calendar, semantic search, and AI chat.

## Commands

```bash
# Start both Next.js and Convex dev servers
npm run dev            # Next.js (port 3000)
npx convex dev         # Convex backend (runs alongside Next.js)

# Type check
npx tsc --noEmit

# Deploy Convex to production
npx convex deploy

# Re-generate Convex types after schema/function changes
npx convex dev --once

# Set Convex environment variables
npx convex env set VAR_NAME value
```

## Architecture

```
Browser (PWA)
  ├── Next.js App Router → Vercel
  │   ├── Auth0 v4 middleware (auth/login, auth/logout, auth/callback routes)
  │   └── /api/auth/token — returns Auth0 ID token for Convex
  ├── ConvexProviderWithAuth — fetches token, passes to Convex
  └── Service worker (public/sw.js) — push notifications + offline cache

Convex (local dev at localhost:3210)
  ├── Schema with vector indexes on dailyReports + weeklyReports
  ├── Hourly cron — checks per-user 8pm in their IANA timezone
  ├── Weekly cron (Monday UTC) — generates AI insights for all users
  └── Node.js actions (ai.ts, pushNotifications.ts) — OpenAI + web-push

OpenAI
  ├── text-embedding-3-small (1536 dims) — embed reports on submit
  └── gpt-4o — chat RAG, weekly insights
```

## Key Conventions

### File split: `"use node"` vs standard Convex runtime
Convex files with `"use node"` at the top **cannot** export `query`, `mutation`, or `internalQuery`/`internalMutation` — those must live in separate files. Current split:
- `convex/ai.ts` — `"use node"` actions only
- `convex/aiInternal.ts` — queries and mutations called by ai.ts
- `convex/pushNotifications.ts` — `"use node"` action only
- `convex/pushSubscriptions.ts` — public mutations/queries for push subscriptions
- `convex/crons.ts` — cron definitions + internalActions + internalMutations/queries

### Auth flow
1. Auth0 v4 middleware (`middleware.ts`) handles all `/auth/*` routes automatically
2. `lib/auth0.ts` saves the ID token in session via `beforeSessionSaved`
3. `/api/auth/token` returns the ID token for Convex to validate
4. `ConvexWithAuth0Provider` (`components/ConvexWithAuth0Provider.tsx`) fetches it and passes to `ConvexProviderWithAuth`
5. `convex/auth.config.ts` validates tokens against Auth0 JWKS using `AUTH0_DOMAIN`
6. First mutation after login: `api.users.getOrCreate` upserts the Convex user record

### Auth0 v4 env vars (different from v3)
- `AUTH0_DOMAIN` — just the domain, e.g. `yourapp.us.auth0.com` (no https://)
- `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`
- Auth0 dashboard: register `{APP_URL}/auth/callback` as Allowed Callback URL

### Report forms (placeholder)
`components/reports/DailyReportForm.tsx` and `WeeklyReportForm.tsx` have placeholder `QUESTIONS` arrays. Replace with the actual question structure when provided. Responses are stored as `Record<string, string>` in `responses: v.any()` on the Convex tables.

### Push notifications
- VAPID keys are pre-generated in `.env.local` (local dev only — regenerate for production)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` goes in Next.js env; `VAPID_PRIVATE_KEY` + `VAPID_SUBJECT` go in Convex dashboard env vars
- The service worker at `public/sw.js` handles `push` events and `notificationclick`
- Users subscribe via `hooks/usePushSubscription.ts` triggered from the dashboard banner

### Convex environment variables (must also be set in Convex dashboard)
`OPENAI_API_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`

### Date handling
- Daily report key: `"yyyy-MM-dd"` string in the user's local timezone
- Weekly report key: `"yyyy-MM-dd"` of the Monday of that week
- Helpers in `lib/utils.ts`: `todayString()`, `currentWeekStartString()`, `formatDateLabel()`
- All timezone-sensitive scheduling done in `convex/crons.ts` using `toLocaleString` with the user's IANA timezone string

## Route Structure

| Route | Description |
|-------|-------------|
| `/` | Landing page (redirects to /dashboard if logged in) |
| `/login`, `/signup` | Redirect to Auth0 |
| `/auth/login?screen_hint=signup` | Auth0 signup screen |
| `/auth/logout` | Auth0 logout |
| `/dashboard` | Stats, calendar, AI insight, push prompt |
| `/reports/daily` | Daily report form |
| `/reports/weekly` | Weekly report form |
| `/calendar` | Full-page calendar view |
| `/search` | Semantic search over past reports |
| `/chat` | RAG chat with report history |

## Development Branch Convention

Active development happens on feature branches. Push changes with:

```bash
git push -u origin <branch-name>
```

Always open a draft pull request after pushing a new branch.
