import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { authorizeModalRequest } from "../_auth";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const auth = authorizeModalRequest(req);
  if (!auth.ok) return auth.response;

  const { userId, tasks } = await req.json();

  try {
    await convex.mutation(api.externalTasks.syncTasks, { userId, tasks });
  } catch (err) {
    console.error("[agent/sync-tasks] Convex mutation failed:", err);
    return NextResponse.json({ error: "Failed to sync tasks" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
