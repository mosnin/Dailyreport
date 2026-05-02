# Agent Tools Reference

**Last updated:** May 2, 2026
**Version:** 1.0

---

## Overview

The agent has two categories of tools:

1. **Built-in callback tools** — defined in `modal_agent/orchestrator.py`, call back into the Next.js app via `AppClient`
2. **Composio platform tools** — loaded dynamically at runtime from `composio_openai.ComposioToolSet` based on which platforms the user has connected

---

## Built-in Tools

### `think(reasoning: str) → str`

**Purpose:** Force the agent to reason through a problem before acting.

**Returns:** `"Reasoning complete. Proceed with your plan."`

**When to call:**
- Before every significant action
- Before any mutation (create / update / delete / send)
- After a tool returns an error, to decide on recovery strategy
- When the intent is ambiguous

**Side effects:** None. Does not call any external service. Does not log to the user.

**Why it exists:** Externalizing reasoning before action significantly reduces incorrect tool calls and misinterpretations. The `think()` call is the reasoning gate — the agent writes out its intent, checks it against the user's request, and only then proceeds.

---

### `post_progress(text: str) → str`

**Purpose:** Send a progress update to the user in real time.

**Returns:** `"Progress noted."`

**Implementation:** Calls `client.post_progress(job_id, user_id, text)` → POST `/api/agent/progress` → Convex `appendProgress` mutation → appends `{ ts, text }` to `agentJobs.progressLog`.

**When to call:** Before each major step (fetching, syncing, creating). The user sees these messages in the live status panel on `/today` and `/agent`.

**Best practices:**
- Keep messages short and active: "Fetching your Trello tasks…", "Syncing 12 tasks…"
- Call this before computationally expensive Composio calls so the user knows work is happening

---

### `get_user_report() → str`

**Purpose:** Fetch the user's last 7 daily reports.

**Returns:** JSON string with shape:
```json
{
  "reports": [
    {
      "date": "2026-05-02",
      "submittedAt": 1746230400000,
      "responses": {
        "dayActivity": "...",
        "peopleMetToday": [{ "id": "...", "name": "...", "goalRelated": true, "notes": "..." }],
        "dailyGoals": ["goal 1", "goal 2"],
        "emotionalDrain": "...",
        "problemsToSolve": [{ "id": "...", "title": "...", "solutions": "..." }],
        "problemsSolvedToday": ["..."],
        "didAffirmations": true,
        "tomorrowPlan": "..."
      }
    }
  ]
}
```
Reports are ordered **newest first**. Up to 7 records.

**Implementation:** GET `/api/agent/data?userId={convexUserId}&type=report` → `api.reports.getRecentReportsForAgent`

**When to call:** At the start of a morning briefing, or when asked about recent activity, patterns, or progress.

---

### `get_user_goals() → str`

**Purpose:** Fetch the user's active goal completion rates across all time horizons.

**Returns:** JSON string with shape:
```json
{
  "goals": {
    "yearly":    { "total": 3, "completed": 1, "periodKey": "2026" },
    "quarterly": { "total": 5, "completed": 3, "periodKey": "2026-Q2" },
    "monthly":   { "total": 4, "completed": 2, "periodKey": "2026-05" },
    "weekly":    { "total": 3, "completed": 0, "periodKey": "2026-04-28" }
  }
}
```

**Implementation:** GET `/api/agent/data?userId={convexUserId}&type=goals` → `api.goals.getCurrentSummary`

**When to call:** At the start of any briefing, or when asked about goals, priorities, or what needs attention. A period with `completed < total` needs attention and should be mentioned in the briefing.

---

### `sync_tasks_to_app(tasks_json: str) → str`

**Purpose:** Persist fetched tasks from an external platform into the app's `externalTasks` table so the user sees them in their Today view.

**Returns:** `"Synced N tasks to the app."` or an error string.

**Input:** A JSON array (as string) where each item is:
```json
{
  "platform": "trello",
  "externalId": "card_abc123",
  "title": "Write the Q2 report",
  "status": "open",
  "completed": false,
  "dueDate": "2026-05-05",
  "url": "https://trello.com/c/...",
  "priority": "high"
}
```

**Implementation:** POST `/api/agent/sync-tasks` → `api.externalTasks.syncTasks` mutation (upsert by `externalId`)

**Constraints:**
- Always call `think()` first to filter to only open, relevant tasks
- Maximum 50 tasks recommended; hard cap of 100 enforced by the Convex mutation
- `platform` must be one of: `slack`, `notion`, `asana`, `clickup`, `trello`, `googlecalendar`
- `externalId` must be unique within the user's data — use the platform's native ID

**When to call:** After fetching tasks from a Composio platform tool. Always sync before completing the job so the user's Today view reflects current state.

---

### `complete_job(result_json: str) → str`

**Purpose:** Mark the job as done and deliver the final structured result to the user.

**Returns:** `"Job completed and delivered to the user."`

**MUST be called last**, after all work is finished.

**Input shapes:**

For briefings:
```json
{
  "briefing": "Alex, you have 3 meetings today starting at 9am...",
  "priorities": ["action 1", "action 2", "action 3"],
  "taskCount": 12
}
```

For other tasks:
```json
{
  "summary": "Synced 12 tasks from Trello. 3 are overdue.",
  "actions": ["Synced 12 tasks", "Created Trello card 'Q2 Draft'"]
}
```

**Implementation:** POST `/api/agent/complete` → `api.agentJobs.completeJob` mutation (sets `status: "done"`, stores `result`, sets `completedAt`)

**Important:** The briefing/summary text is shown directly to the user on the `/today` page and `/agent` page. Make it specific, personal, and actionable. Never use generic filler.

---

## Composio Platform Tools

Composio tools are loaded at runtime based on `request.connectedPlatforms`. If a user has not connected a platform, no tools for that platform are loaded. This keeps the tool list lean.

```python
for platform_id in request.connectedPlatforms:
    composio_app = PLATFORM_APP_MAP.get(platform_id.lower())
    tools = toolset.get_tools(apps=[composio_app])
    composio_tools.extend(tools)
```

### Platform → Composio App mapping (`orchestrator.py`)

| Platform ID | Composio App |
|---|---|
| `slack` | `App.SLACK` |
| `notion` | `App.NOTION` |
| `asana` | `App.ASANA` |
| `clickup` | `App.CLICKUP` |
| `trello` | `App.TRELLO` |
| `googlecalendar` | `App.GOOGLECALENDAR` |

### Common Composio tool patterns

**Trello:**
- `TRELLO_LIST_BOARDS` — get all boards
- `TRELLO_LIST_CARDS_IN_LIST` — get cards in a specific list
- `TRELLO_CREATE_CARD` — create a card
- `TRELLO_UPDATE_CARD` — move card, change status, add due date

**Asana:**
- `ASANA_GET_TASKS_FROM_PROJECT` — list tasks in a project
- `ASANA_CREATE_TASK` — create a task
- `ASANA_UPDATE_TASK` — update status, due date

**Google Calendar:**
- `GOOGLECALENDAR_LIST_EVENTS` — get events for a date range
- `GOOGLECALENDAR_CREATE_EVENT` — create an event
- `GOOGLECALENDAR_UPDATE_EVENT` — modify an event

> **Note:** The full list of available actions for each app is determined by the Composio SDK version. Call `toolset.get_tools(apps=[App.TRELLO])` to see all loaded tools at runtime.

---

## Tool Call Order (recommended)

For a morning briefing:
```
think → post_progress → get_user_report → get_user_goals
  → [calendar tool if connected] → think → complete_job
```

For task sync:
```
think → post_progress → [platform list tool] → think
  → sync_tasks_to_app → complete_job
```

For create/update/delete:
```
think → post_progress → [platform action tool] → complete_job
```

For failure recovery:
```
[tool call fails] → think → post_progress("I ran into an issue with...") → complete_job
```
