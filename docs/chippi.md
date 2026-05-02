# Chippi — The AI Agent

**Last updated:** May 2, 2026
**Version:** 1.0

---

## What Chippi Is

Chippi is the user's personal AI chief of staff. It runs on Modal (Python sandboxes), is orchestrated by the OpenAI Agents SDK, and has access to the user's reports, goals, and connected external platforms (Slack, Notion, Asana, ClickUp, Trello, Google Calendar via Composio).

Chippi is not a chatbot wrapper. It is a multi-step agentic loop: it receives an intent, plans a sequence of tool calls, executes them, and delivers a structured result. The user sees live progress updates while it runs.

---

## How Chippi Is Invoked

Two paths:

### 1. Morning Briefing (automatic, 8am local time)
The Convex hourly cron (`convex/crons.ts`) runs every hour. For each user whose local time is 8am AND whose `onboardingComplete === true` AND who hasn't received a morning briefing today:
1. Marks `sentNotifications` (type: `"morning_briefing"`, date: today) to prevent duplicates
2. Calls `internal.agentScheduler.triggerMorningBriefing`
3. `agentScheduler.ts` fetches the user's `name`, `timezone`, and `connectedPlatforms` from Convex
4. Builds a personalized, date-aware intent string
5. Creates a queued job in `agentJobs`
6. POSTs to Modal's `/run` endpoint with full context

### 2. User Command (on demand)
User types a command on `/today` or `/agent`, clicks Send:
1. `createJob` mutation creates a queued `agentJobs` record
2. Client POSTs to `/api/agent/trigger` with `{ jobId, intent, convexUserId, connectedPlatforms, userName, userTimezone }`
3. Trigger route calls Modal's `/run` endpoint (fire-and-forget — does not await)
4. Returns `{ ok: true }` immediately; the UI polls via real-time Convex subscription

---

## System Prompt

The system prompt is **dynamic** — built fresh for each invocation by `build_system_prompt(request)` in `modal_agent/orchestrator.py`. It injects:

| Variable | Source | Purpose |
|---|---|---|
| `{name}` | `request.userName` | Personalizes every instruction and output |
| `now_str` | `request.today` or computed from `request.userTimezone` | Gives the agent temporal awareness |
| `{tz}` | `request.userTimezone` | Shown in the header for scheduling accuracy |
| `{platforms}` | `request.connectedPlatforms` | Tells the agent what tools are available |

### Reasoning Gate (mandatory `think()` calls)

The system prompt requires `think()` to be called before every significant action. This is enforced by instruction, not code. The reasoning sections in the prompt:

> **Before every action:** call think() to reason through (1) what the user actually needs, (2) the exact sequence of steps, (3) whether the action is reversible.

This pattern dramatically reduces incorrect tool calls and misinterpretations. The `think()` tool is a no-op (returns a constant string) that exists solely to give the model a structured channel to externalize its reasoning before acting.

### Mutation Guardrails

For CREATE / UPDATE / DELETE operations, the system prompt adds:

> **REQUIRED: call think() first.** Verify: (a) action exactly matches stated intent, (b) you have all required fields, (c) action is reversible OR user explicitly requested it. NEVER delete without unambiguous instruction. When in doubt, describe what you would do via post_progress() instead of acting.

This prevents the agent from, e.g., deleting a Trello card because the user said "remove that from my list" in an ambiguous context.

---

## Behavioral Modes

### Morning Briefing
**Intent pattern:** starts with `"Morning briefing for {name} on {date}:"`

Steps the agent should follow:
1. `think()` — plan the briefing approach
2. `post_progress("Fetching your recent reports…")`
3. `get_user_report()` — last 7 daily reports
4. `get_user_goals()` — completion rates by period
5. If Google Calendar connected: fetch today's events via Composio tool
6. `think()` — synthesize what matters most
7. `complete_job({"briefing": "...", "priorities": ["...", "...", "..."], "taskCount": N})`

The briefing must be **specific**: actual goal category names, actual task counts, actual calendar events. Generic platitudes ("stay focused!") are explicitly prohibited by the system prompt.

### Task Operations
**Intent pattern:** "pull my tasks", "what's overdue", "sync my Asana"

Steps:
1. `think()` — which platform, what filter
2. `post_progress("Fetching tasks from Trello…")`
3. Platform tool (Composio) — list cards/tasks
4. `think()` — filter to open, relevant tasks (max 50)
5. `sync_tasks_to_app(tasks_json)` — persists to `externalTasks` table; user sees them in `/today`
6. `complete_job({"summary": "...", "actions": ["Synced 12 tasks from Trello, 3 overdue"]})`

### Create / Update / Delete
**Intent pattern:** "add a task", "create a calendar event", "move that card to Done"

Steps:
1. `think()` — confirm all fields, verify intent, check reversibility
2. `post_progress("Creating Trello card…")`
3. Composio tool — execute the action
4. `complete_job({"summary": "Done.", "actions": ["Created card 'Q2 Report' in Trello"]})`

### Failure Recovery
If a tool errors, the system prompt instructs:
> call think() to decide: retry, use alternate data source, or report the failure clearly. Never fabricate data.

---

## Output Format

`complete_job()` is called with a JSON string. Two shapes:

**Briefings:**
```json
{
  "briefing": "Alex, you have 2 meetings today and 5 open Trello tasks...",
  "priorities": [
    "Complete the Q2 report draft before 2pm standup",
    "Review 3 overdue Asana tickets before EOD",
    "15-minute meditation to hit your weekly goal"
  ],
  "taskCount": 5
}
```

**Other tasks:**
```json
{
  "summary": "Synced 12 tasks from Trello. 3 are overdue.",
  "actions": [
    "Synced 12 open tasks from Trello",
    "3 overdue: 'Landing page copy', 'API docs', 'Q2 review'"
  ]
}
```

The UI (`/today` conversation thread, `/agent` briefing card) reads these fields directly. `result.briefing ?? result.summary` is the primary display text.

---

## Python Fallback

If the agent hits `max_turns` (20) without calling `complete_job()`, Python handles completion using `run_result.final_output`:

```python
if not completion_state["completed"]:
    output = run_result.final_output
    # Parse as JSON dict, or wrap plain string as {"briefing": output}
    client.complete_job(job_id, user_id, result)
```

This guarantees the job never stays in `"running"` state due to a turn-limit issue.

---

## Key Configuration

| Setting | Value | File |
|---|---|---|
| Model | `gpt-4o` | `orchestrator.py` |
| Max turns | `20` | `orchestrator.py` |
| Modal timeout | `300s` | `app.py` |
| Cold start | Enabled (`min_containers=0`, `scaledown_window=0`) | `app.py` |
| Retries | `0` (Modal level) | `app.py` |

---

## Where Results Are Displayed

| Invocation | Display location |
|---|---|
| Morning briefing | `/today` — "Morning briefing" card (filtered by intent prefix) |
| User command from `/today` | `/today` — conversation thread |
| User command from `/agent` | `/agent` — active job panel + briefing card |
| Any completed job | Accessible via `listRecentJobs` anywhere in the app |
