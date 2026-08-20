import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Pulls projects from a connected ClickUp / Trello account via Composio and
 * returns them in the app's project shape. The client then persists them with
 * `api.projects.syncFromConnector`.
 *
 * Body: { platform: "clickup" | "trello", connectionId: string }
 *
 * Composio action names vary slightly by account; we try a few candidates and
 * parse defensively so a schema mismatch degrades to an empty result rather
 * than a crash.
 */

const COMPOSIO_EXEC = "https://backend.composio.dev/api/v1/actions/execute";

type SyncProject = {
  externalId: string;
  title: string;
  description?: string;
  status?: string;
  progress?: number;
  externalUrl?: string;
  dueDate?: string;
};

function pickArray(data: any): any[] {
  if (!data) return [];
  const candidates = [
    data?.data?.items,
    data?.data?.boards,
    data?.data?.spaces,
    data?.data?.tasks,
    data?.data,
    data?.response_data?.items,
    data?.response_data,
    data?.items,
    data,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

function statusToProgress(status?: string): number {
  const s = (status ?? "").toLowerCase();
  if (/(done|complete|closed|finished)/.test(s)) return 100;
  if (/(review|testing|qa)/.test(s)) return 80;
  if (/(progress|doing|active|started)/.test(s)) return 50;
  if (/(blocked|hold)/.test(s)) return 30;
  if (/(todo|backlog|open|planning|new)/.test(s)) return 10;
  return 0;
}

async function execAction(apiKey: string, connectionId: string, action: string, input: Record<string, unknown>) {
  const res = await fetch(COMPOSIO_EXEC, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify({ action, connectedAccountId: connectionId, input }),
  });
  if (!res.ok) return null;
  return res.json();
}

async function tryActions(
  apiKey: string,
  connectionId: string,
  candidates: { action: string; input: Record<string, unknown> }[]
): Promise<any[]> {
  for (const c of candidates) {
    try {
      const data = await execAction(apiKey, connectionId, c.action, c.input);
      const arr = pickArray(data);
      if (arr.length > 0) return arr;
    } catch {
      /* try next */
    }
  }
  return [];
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { platform?: string; connectionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ projects: [], error: "Invalid request" }, { status: 400 });
  }

  const platform = body.platform?.toLowerCase();
  const connectionId = body.connectionId;
  if (platform !== "clickup" && platform !== "trello") {
    return NextResponse.json({ projects: [], error: "Unsupported platform" }, { status: 400 });
  }
  if (!connectionId) {
    return NextResponse.json({ projects: [], error: "Reconnect this tool, then try again." }, { status: 400 });
  }

  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ projects: [], error: "Composio is not configured on this server." }, { status: 200 });
  }

  try {
    const projects: SyncProject[] = [];

    if (platform === "trello") {
      const boards = await tryActions(apiKey, connectionId, [
        { action: "TRELLO_GET_MEMBER_BOARDS", input: { idMember: "me", filter: "open" } },
        { action: "TRELLO_GET_BOARDS", input: { filter: "open" } },
        { action: "TRELLO_BOARDS_GET_MEMBERSHIPS", input: {} },
      ]);
      for (const b of boards) {
        const id = b?.id ?? b?.shortLink;
        if (!id) continue;
        projects.push({
          externalId: `trello:${id}`,
          title: b?.name ?? "Untitled board",
          description: b?.desc || undefined,
          status: b?.closed ? "done" : "active",
          progress: b?.closed ? 100 : undefined,
          externalUrl: b?.url || b?.shortUrl || undefined,
        });
      }
    }

    if (platform === "clickup") {
      // ClickUp is hierarchical: workspaces → spaces. We surface spaces as projects.
      const teams = await tryActions(apiKey, connectionId, [
        { action: "CLICKUP_GET_AUTHORIZED_TEAMS_WORKSPACES", input: {} },
        { action: "CLICKUP_AUTHORIZATION_GET_WORKSPACE_SEATS", input: {} },
      ]);
      const teamIds = teams.map((t: any) => t?.id ?? t?.team?.id).filter(Boolean).slice(0, 3);
      for (const teamId of teamIds) {
        const spaces = await tryActions(apiKey, connectionId, [
          { action: "CLICKUP_GET_SPACES", input: { team_id: teamId } },
          { action: "CLICKUP_SPACES_GET_SPACES", input: { team_id: teamId } },
        ]);
        for (const s of spaces) {
          const id = s?.id;
          if (!id) continue;
          projects.push({
            externalId: `clickup:${id}`,
            title: s?.name ?? "Untitled space",
            status: s?.archived ? "done" : "active",
            progress: s?.archived ? 100 : undefined,
          });
        }
      }
      // Fallback: if no spaces surfaced, try filtered tasks across the first team.
      if (projects.length === 0 && teamIds[0]) {
        const tasks = await tryActions(apiKey, connectionId, [
          { action: "CLICKUP_GET_FILTERED_TEAM_TASKS", input: { team_id: teamIds[0] } },
        ]);
        for (const t of tasks.slice(0, 50)) {
          const id = t?.id;
          if (!id) continue;
          projects.push({
            externalId: `clickup:${id}`,
            title: t?.name ?? "Untitled task",
            status: t?.status?.status ?? t?.status,
            progress: statusToProgress(t?.status?.status ?? t?.status),
            externalUrl: t?.url || undefined,
            dueDate: t?.due_date ? new Date(Number(t.due_date)).toISOString().split("T")[0] : undefined,
          });
        }
      }
    }

    if (projects.length === 0) {
      return NextResponse.json({
        projects: [],
        error: "No projects found. Make sure the tool is connected and has boards/spaces.",
      });
    }
    return NextResponse.json({ projects });
  } catch (e) {
    console.error("sync error", e);
    return NextResponse.json({ projects: [], error: "Sync failed. Try reconnecting the tool." }, { status: 200 });
  }
}
