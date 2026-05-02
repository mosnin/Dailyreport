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

  const { jobId, error, userId } = await req.json();

  try {
    // @ts-ignore — agentJobs module added in parallel; run npx convex dev --once to regenerate types
    await convex.mutation(api.agentJobs.failJob, { jobId, error, userId });
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true });
}
