import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { authorizeModalRequest } from "../_auth";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const auth = authorizeModalRequest(req);
  if (!auth.ok) return auth.response;

  const { jobId, error, userId } = await req.json();

  try {
    // @ts-ignore — agentJobs module added in parallel; run npx convex dev --once to regenerate types
    await convex.mutation(api.agentJobs.failJob, { jobId, error, userId });
  } catch (err) {
    console.error("[agent/fail] Convex mutation failed:", err);
    return NextResponse.json({ error: "Failed to fail job" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
