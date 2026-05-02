import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secretHeader = req.headers.get("x-modal-secret");
  const secret = process.env.MODAL_AGENT_SECRET ?? "";
  const authorized = authHeader === `Bearer ${secret}` || secretHeader === secret;
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, tasks } = await req.json();

  try {
    await convex.mutation(api.externalTasks.syncTasks, { userId, tasks });
  } catch (err) {
    console.error("[agent/sync-tasks] Convex mutation failed:", err);
    return NextResponse.json({ error: "Failed to sync tasks" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
