import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function failJobSafely(jobId: string | undefined, convexUserId: string | undefined, error: string) {
  if (!jobId || !convexUserId) return;
  try {
    await convex.mutation(api.agentJobs.failJob, {
      jobId: jobId as any,
      userId: convexUserId as any,
      error,
    });
  } catch {}
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    jobId,
    intent,
    convexUserId,
    connectedPlatforms = [],
    userName = "",
    userTimezone = "",
  } = await req.json();

  if (!jobId || !convexUserId || !intent) {
    await failJobSafely(jobId, convexUserId, "Invalid agent trigger payload.");
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const modalUrl = process.env.MODAL_AGENT_URL;
  const secret = process.env.MODAL_AGENT_SECRET;
  if (!modalUrl || !secret) {
    await failJobSafely(jobId, convexUserId, "Agent not configured. Set MODAL_AGENT_URL and MODAL_AGENT_SECRET.");
    return NextResponse.json(
      { ok: false, error: "Agent not configured. Set MODAL_AGENT_URL and MODAL_AGENT_SECRET." },
      { status: 503 }
    );
  }

  const traceId = crypto.randomUUID();

  const payload = {
    contractVersion: "2026-05-02.v1",
    userId,
    convexUserId,
    intent,
    jobId,
    connectedPlatforms,
    userName,
    userTimezone,
    today: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      ...(userTimezone ? { timeZone: userTimezone } : {}),
    }).format(new Date()),
    traceId,
  };

  try {
    const response = await fetch(`${modalUrl}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`Modal /run returned HTTP ${response.status}${errorText ? `: ${errorText}` : ""}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Agent service unreachable";
    await failJobSafely(jobId, convexUserId, message);
    return NextResponse.json({ ok: false, error: message, traceId }, { status: 502 });
  }

  return NextResponse.json({ ok: true, traceId });
}
