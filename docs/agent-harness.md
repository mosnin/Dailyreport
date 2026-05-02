# Agent Harness

**Last updated:** May 3, 2026
**Version:** 1.2

---

## Overview

The agent harness is the infrastructure layer that runs agent jobs. It consists of:

- **Modal** — Python sandbox execution environment (cold-start, pay-per-use)
- **`modal_agent/`** — Python package: orchestrator, client, types, app
- **Convex `agentJobs` table** — job lifecycle tracking (real-time, queried by the UI)
- **Next.js API routes** — bridge between Convex/browser and Modal

```
Browser / Cron
    │
    ▼
Next.js API (/api/agent/trigger)
    │   fire-and-forget
    ▼
Modal /run endpoint (FastAPI, cold-start)
    │   spawns
    ▼
run_agent_job() function (Modal Function)
    │
    ▼
orchestrator.run_agent()
    ├── Composio tools loaded
    ├── Agent loop (OpenAI Agents SDK, max 20 turns)
    │   └── tool calls → callbacks → /api/agent/* routes → Convex mutations
    └── client.complete_job() or client.fail_job()
```

---

## Job Lifecycle

Jobs live in the `agentJobs` Convex table:

```
queued → running → done
                 → failed
```

| Status | Set by | When |
|---|---|---|
| `queued` | `createJob` or `createJobInternal` mutation | Job created, before Modal starts |
| `running` | `appendProgress` mutation (first progress call) | Agent's first `post_progress()` call |
| `done` | `completeJob` mutation | Agent calls `complete_job()` or Python fallback completes |
| `failed` | `failJob` / `failJobInternal` mutation | Agent errors, Modal rejects, or network fails |

**Important:** The UI (`/today`, `/agent`) subscribes to `agentJobs` in real time via Convex. Status changes and progress log appends are immediately reflected in the UI without polling.

---

## Convex Tables

### `agentJobs`
```typescript
{
  userId: Id<"users">
  status: "queued" | "running" | "done" | "failed"
  intent: string              // The user's instruction or morning briefing text
  progressLog: { ts: number; text: string }[]  // Live progress updates
  result?: any                // Structured result from complete_job()
  error?: string              // Error message if failed
  createdAt: number
  completedAt?: number
}
// Indexes: by_user (for listRecentJobs), by_user_status
```

### `externalTasks`
```typescript
{
  userId: Id<"users">
  platform: "slack" | "notion" | "asana" | "clickup" | "trello" | "googlecalendar"
  externalId: string          // Platform-native ID (used for upsert)
  title: string
  status: string
  dueDate?: string            // YYYY-MM-DD
  url?: string
  priority?: string
  completed: boolean
  lastSynced: number          // Unix timestamp
}
// Indexes: by_user, by_user_platform, by_user_external
```

---

## Modal Deployment (`modal_agent/app.py`)

```python
app = modal.App("dailyreport-agent")

image = (
    modal.Image.debian_slim(python_version="3.12")
    .pip_install(
        "openai-agents>=0.0.14",
        "composio-openai>=0.5.0",
        "httpx>=0.27.0",
        "pydantic>=2.7.0",
        "fastapi>=0.111.0",
    )
    .add_local_python_source("modal_agent")
)

agent_secrets = modal.Secret.from_name("dailyreport-agent")
```

**Key settings:**
- `min_containers=0` — no warm instances; cold start accepted to save cost
- `scaledown_window=0` — container shuts down immediately after use
- `timeout=300` — 5-minute max per job (adequate for multi-step briefings with slow Composio calls)
- `retries=0` — no automatic Modal retries; failure is surfaced immediately to the user

**Two functions:**
1. `run_agent_job(request_dict: dict)` — the actual agent runner (spawned async)
2. `fastapi_app()` — ASGI app serving the `/run` and `/health` HTTP endpoints

The FastAPI app authenticates via `Authorization: Bearer {MODAL_AGENT_SECRET}` before spawning jobs.

---

## `AgentRequest` Type (`modal_agent/types.py`)

```python
class AgentRequest(BaseModel):
    userId: str             # Clerk user ID (entity_id for Composio)
    convexUserId: str       # Convex document ID (used for DB callbacks)
    intent: str             # The user's instruction
    jobId: str              # Convex agentJobs document ID
    connectedPlatforms: list[str] = []  # e.g. ["trello", "googlecalendar"]
    userName: str = ""      # User's display name (injected into system prompt)
    userTimezone: str = "UTC"   # IANA timezone
    today: str = ""         # Pre-formatted date string (e.g. "Saturday, May 2, 2026")
```

---

## `AppClient` (`modal_agent/client.py`)

The client makes HTTP callbacks from the Modal container back to the Next.js app. The app URL is `APP_URL` env var (Modal secret).

All requests authenticated with `Authorization: Bearer {MODAL_AGENT_SECRET}`.

| Method | Endpoint | Convex mutation | Retry? |
|---|---|---|---|
| `post_progress(job_id, user_id, text)` | POST `/api/agent/progress` | `appendProgress` | No (best-effort) |
| `complete_job(job_id, user_id, result)` | POST `/api/agent/complete` | `completeJob` | Yes (2 retries, 1s→2s backoff) |
| `fail_job(job_id, user_id, error)` | POST `/api/agent/fail` | `failJob` | Yes (2 retries) |
| `sync_tasks(user_id, tasks)` | POST `/api/agent/sync-tasks` | `syncTasks` | No |
| `get_data(user_id, type)` | GET `/api/agent/data` | (query) | No |

**`_post_with_retry(url, json_data, timeout, retries=2)`** — used by `complete_job` and `fail_job`. Raises after `retries+1` failed attempts, which causes the outer exception handler to call `fail_job` (or propagate the error if `fail_job` itself failed).

**`post_progress` is fire-and-forget** — exceptions are swallowed. A failed progress update is acceptable; a failed completion/failure update is not.

---

## Next.js API Routes

All agent routes live under `app/api/agent/`.

### `POST /api/agent/trigger`
**Auth:** Clerk session (`auth()` from `@clerk/nextjs/server`)

Accepts from client:
```json
{
  "jobId": "...",
  "intent": "...",
  "convexUserId": "...",
  "connectedPlatforms": ["trello"],
  "userName": "Alex",
  "userTimezone": "America/New_York"
}
```

Computes `today` string server-side (using `userTimezone`), then calls Modal's `/run` endpoint **fire-and-forget** (does not `await`). Returns `{ ok: true }` immediately.

The `.catch()` handler on the fire-and-forget fetch calls `api.agentJobs.failJob` if Modal is unreachable.

### `POST /api/agent/progress`
**Auth:** `Bearer MODAL_AGENT_SECRET`

Calls `api.agentJobs.appendProgress`. Errors are logged and return 500 (though `AppClient.post_progress` swallows them).

### `POST /api/agent/complete`
**Auth:** `Bearer MODAL_AGENT_SECRET`

Calls `api.agentJobs.completeJob`. Errors are **logged** (`console.error`) and return 500 so `AppClient._post_with_retry` can retry.

### `POST /api/agent/fail`
**Auth:** `Bearer MODAL_AGENT_SECRET`

Calls `api.agentJobs.failJob`. Same logging/500 behavior as `/complete`.

### `POST /api/agent/sync-tasks`
**Auth:** `Bearer MODAL_AGENT_SECRET`

Calls `api.externalTasks.syncTasks`. Errors logged, returns 500.

### `GET /api/agent/data`
**Auth:** `Bearer MODAL_AGENT_SECRET`

Accepts `?userId={convexUserId}&type=report|goals`. Returns report or goal data from Convex. Protected only by the Modal secret — no user session required (Modal acts on behalf of the user).

---

## Morning Briefing Cron (`convex/agentScheduler.ts`)

Triggered by `convex/crons.ts` hourly cron when user's local hour is 8.

```typescript
// convex/agentScheduler.ts — "use node" runtime
export const triggerMorningBriefing = internalAction({
  args: { userId: v.id("users"), clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.users.getUserForScheduler, { userId: args.userId });
    const connectedPlatforms = await ctx.runQuery(
      internal.integrations.getConnectedPlatformsInternal, { userId: args.userId }
    );
    // Builds personalized intent, creates agentJobs record, POSTs to Modal
  }
});
```

**Dedup:** Checked via `sentNotifications` (type: `"morning_briefing"`, date: today in user's timezone) before triggering. Only fires once per user per calendar day.

**Guard:** `user.onboardingComplete === true` is required. Non-onboarded users are skipped.

---

## Security Model

| Path | Auth mechanism | What it protects |
|---|---|---|
| `/api/agent/trigger` | Clerk session | Ensures only authenticated users can dispatch jobs |
| `/api/agent/progress`, `/complete`, `/fail`, `/sync-tasks`, `/data` | `MODAL_AGENT_SECRET` bearer token | Ensures only the Modal container (acting as the agent) can update job state |
| Convex mutations `completeJob`, `failJob`, `appendProgress` | Called via `ConvexHttpClient` (no auth) | Protected upstream by the route-level secret check |
| Convex `syncTasks` | `userId` arg | No ownership check on upsert — trusted because only Modal (with secret) can reach this endpoint |

**Ownership check added in `markTaskComplete`:** When a user manually marks a task done from the UI, the mutation verifies `task.userId === args.userId` before patching.

---

## Deployment

### Automatic (CI)

`.github/workflows/deploy-modal.yml` runs on every push to `main` that touches `modal_agent/**`. It runs `modal deploy modal_agent/app.py` using the `MODAL_TOKEN_ID` + `MODAL_TOKEN_SECRET` GitHub repo secrets. Manual runs available via the workflow_dispatch trigger.

### One-time setup

```bash
# 1. CI auth — generate a Modal API token, then add as GitHub repo secrets
#    (MODAL_TOKEN_ID, MODAL_TOKEN_SECRET)
modal token new --source github

# 2. Runtime secrets — create the Modal Secret the agent reads at runtime
modal secret create dailyreport-agent \
  OPENAI_API_KEY=sk-... \
  COMPOSIO_API_KEY=... \
  MODAL_AGENT_SECRET=your-random-secret \
  APP_URL=https://your-app.vercel.app

# 3. Manual deploy (only needed for the very first deploy or to test locally)
modal deploy modal_agent/app.py

# 4. Test the health endpoint
curl https://your-modal-app-url/health
```

After the first deploy, set `MODAL_AGENT_URL` and `MODAL_AGENT_SECRET` in Vercel and Convex environment variables. `MODAL_AGENT_SECRET` must match the value in the Modal `dailyreport-agent` secret.
