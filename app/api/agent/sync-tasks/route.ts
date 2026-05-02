import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.MODAL_AGENT_SECRET ?? "";
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, tasks } = await req.json();

  try {
    // @ts-ignore — externalTasks module added in parallel; run npx convex dev --once to regenerate types
    await convex.mutation(api.externalTasks.syncTasks, { userId, tasks });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true });
}
