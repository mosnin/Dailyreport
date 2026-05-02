import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { authorizeModalRequest } from "../_auth";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const auth = authorizeModalRequest(req);
  if (!auth.ok) return auth.response;

  const { jobId, text, userId } = await req.json();

  try {
    // @ts-ignore — agentJobs module added in parallel; run npx convex dev --once to regenerate types
    await convex.mutation(api.agentJobs.appendProgress, { jobId, text, userId });
  } catch {
    // progress updates are best-effort
  }

  return NextResponse.json({ ok: true });
}
