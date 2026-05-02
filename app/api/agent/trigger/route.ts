import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

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

  const modalUrl = process.env.MODAL_AGENT_URL;
  if (!modalUrl) {
    return NextResponse.json(
      { ok: false, error: "Agent not configured. Set MODAL_AGENT_URL." },
      { status: 503 }
    );
  }

  const secret = process.env.MODAL_AGENT_SECRET ?? "";

  const payload = {
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
  };

  // Fire-and-forget — job status is tracked via Convex real-time.
  // Do NOT await: Modal cold start can exceed Vercel's 30s route timeout.
  void (async () => {
    try {
      const response = await fetch(`${modalUrl}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Modal /run returned HTTP ${response.status}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Agent service unreachable";
      // If Modal is unreachable or rejects the call, fail the job so UI doesn't poll forever.
      void convex
        .mutation(api.agentJobs.failJob, {
          jobId,
          userId: convexUserId,
          error: message,
        })
        .catch(() => {});
    }
  })();

  return NextResponse.json({ ok: true });
}
