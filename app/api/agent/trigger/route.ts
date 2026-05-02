import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId, intent, convexUserId } = await req.json();

  const modalUrl = process.env.MODAL_AGENT_URL;
  if (!modalUrl) {
    return NextResponse.json(
      { ok: false, error: "Agent not configured. Set MODAL_AGENT_URL." },
      { status: 503 }
    );
  }

  const secret = process.env.MODAL_AGENT_SECRET ?? "";

  try {
    await fetch(`${modalUrl}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ userId, convexUserId, intent, jobId }),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to reach agent service" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
