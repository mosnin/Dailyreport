# Platform Integrations

**Last updated:** May 2, 2026
**Version:** 1.0

---

## Overview

Integrations connect the agent to the user's external work tools. All OAuth connections are managed through **Composio** — the app never handles OAuth tokens directly. When connected, the agent can read and write to these platforms during agent jobs.

---

## Supported Platforms

| Platform | ID | Composio App | What the agent can do |
|---|---|---|---|
| Google Calendar | `googlecalendar` | `App.GOOGLECALENDAR` | View today's events, create events, block focus time |
| Slack | `slack` | `App.SLACK` | Read messages, reply, send messages |
| Notion | `notion` | `App.NOTION` | Read/write pages, databases, tasks |
| Asana | `asana` | `App.ASANA` | List tasks, create tasks, update status |
| ClickUp | `clickup` | `App.CLICKUP` | List/create/update tasks, lists, priorities |
| Trello | `trello` | `App.TRELLO` | Manage boards, cards, lists, due dates |

> **Google Calendar is first** in the UI (integrations page PLATFORMS array) because calendar is the ground truth of someone's day — it should be connected before anything else.

---

## Data Model

Connections are stored in the `integrations` Convex table:

```typescript
integrations: {
  userId: Id<"users">
  platform: "slack" | "notion" | "clickup" | "trello" | "asana" | "googlecalendar"
  composioConnectionId: string   // Composio's connection identifier
  connected: boolean
  connectedAt: number            // Unix timestamp
  metadata?: any                 // Optional platform-specific metadata
}
// Indexes: by_user, by_user_platform
```

**Key constraint:** `by_user_platform` is unique — one active connection per platform per user. `saveIntegration` upserts rather than inserting duplicates.

---

## Connect Flow

### Step 1 — User clicks "Connect" on `/integrations`

```typescript
// app/(dashboard)/integrations/page.tsx
async function handleConnect(platform: string) {
  const res = await fetch(`/api/integrations/connect?platform=${platform}`);
  const { redirectUrl } = await res.json();
  if (redirectUrl) window.location.href = redirectUrl;
}
```

### Step 2 — Next.js API route calls Composio

**Route:** `GET /api/integrations/connect?platform=TRELLO`

```typescript
// app/api/integrations/connect/route.ts
const res = await fetch("https://backend.composio.dev/api/v1/connectedAccounts", {
  method: "POST",
  headers: { "x-api-key": composioApiKey },
  body: JSON.stringify({
    integrationId: platform,          // e.g. "TRELLO"
    redirectUri: `${appUrl}/integrations`,
    userUuid: userId,                  // Clerk userId — Composio entity identifier
    data: { redirectParams: `platform=${platform.toLowerCase()}` },
  }),
});
// Returns { redirectUrl: "https://composio.dev/oauth/..." }
```

**Error handling:** Non-2xx responses from Composio are caught, logged with `console.error`, and returned as `{ error: "Composio connection failed", status: 502 }` — the client shows nothing in the UI (connect button stays visible).

### Step 3 — User completes OAuth on Composio's hosted page

Composio handles the OAuth dance with the platform (Google, Trello, Slack, etc.).

### Step 4 — Composio redirects back to `/integrations`

Redirect URL: `{appUrl}/integrations?connectionId=conn_abc123&platform=trello`

### Step 5 — Callback handled client-side

```typescript
// app/(dashboard)/integrations/page.tsx
useEffect(() => {
  const connectionId = searchParams.get("connectionId");
  const platform = searchParams.get("platform");
  if (connectionId && platform && convexUserId) {
    saveIntegration({
      userId: convexUserId,
      platform: platform as any,
      composioConnectionId: connectionId,
    }).then(() => router.replace("/integrations")); // Clean URL
  }
}, [searchParams, convexUserId, saveIntegration, router]);
```

The `saveIntegration` Convex mutation upserts the record; `router.replace` strips the `?connectionId=...` params from the URL.

---

## Disconnect Flow

User clicks "Disconnect" on the platform card:

```typescript
removeIntegration({ userId: convexUserId, platform: platform.id })
```

This deletes the `integrations` record from Convex. It does **not** revoke the Composio connection — the OAuth token remains valid on Composio's side. If the user reconnects later, a new `connectionId` is created.

> **Note:** To fully revoke access, the user should also disconnect from within the platform's settings (e.g., Trello → Power-Ups → remove DailyReport).

---

## How Connected Platforms Reach the Agent

At job dispatch time, the client/scheduler fetches the user's connected platforms and passes them as `connectedPlatforms: string[]` to Modal:

**User-initiated jobs** (`/today`, `/agent` pages):
```typescript
const integrations = useQuery(api.integrations.getUserIntegrations, { userId: convexUserId });
const connectedPlatforms = integrations.map(i => i.platform);
// Passed in the trigger fetch body
```

**Morning briefing (cron)**:
```typescript
// convex/agentScheduler.ts
const connectedPlatforms = await ctx.runQuery(
  internal.integrations.getConnectedPlatformsInternal,
  { userId: args.userId }
);
// Passed in the Modal fetch body
```

In the Modal container, `orchestrator.py` loads **only** the Composio tools for the connected platforms:
```python
for platform_id in request.connectedPlatforms:
    composio_app = PLATFORM_APP_MAP.get(platform_id.lower())
    tools = toolset.get_tools(apps=[composio_app])
    composio_tools.extend(tools)
```

This keeps the tool list minimal — an agent with no connected platforms only has the 5 built-in tools.

---

## Environment Variables

| Variable | Location | Purpose |
|---|---|---|
| `COMPOSIO_API_KEY` | Modal secret (`dailyreport-agent`) | Authenticates Composio API calls in the container |
| `NEXT_PUBLIC_APP_URL` | `.env.local` | Used as `redirectUri` in the connect API route |
| `COMPOSIO_API_KEY` | `.env.local` | Used by the connect API route (server-side Next.js) |

> The Composio API key is needed in two places: the Next.js connect route (to initiate OAuth) and the Modal container (to load tools). These can be the same key.

---

## Adding a New Platform

1. Add `v.literal("newplatform")` to the `PLATFORM` union in `convex/integrations.ts`
2. Add `v.literal("newplatform")` to the `integrations.platform` union in `convex/schema.ts`
3. Add the platform card to `PLATFORMS` array in `app/(dashboard)/integrations/page.tsx`
4. Add `"newplatform": App.NEWPLATFORM` to `PLATFORM_APP_MAP` in `modal_agent/orchestrator.py`
5. Run `npx convex dev --once` to regenerate types
6. Update this document

---

## Composio Entity Model

Each user is identified to Composio by their **Clerk `userId`** (the `clerkId` string, e.g. `user_2abc...`). This is passed as `entity_id` when creating the `ComposioToolSet`:

```python
toolset = ComposioToolSet(
    api_key=os.environ["COMPOSIO_API_KEY"],
    entity_id=request.userId,  # Clerk userId
)
```

And as `userUuid` in the connect API route. This means all of a user's platform connections in Composio are scoped under their Clerk ID.
