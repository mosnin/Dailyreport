import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secretHeader = req.headers.get("x-modal-secret");
  const secret = process.env.MODAL_AGENT_SECRET ?? "";
  const authorized = authHeader === `Bearer ${secret}` || secretHeader === secret;
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const type = searchParams.get("type");

  if (!userId || !type) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    if (type === "report") {
      // getRecentReportsForAgent has no auth check — protected by MODAL_AGENT_SECRET above
      // @ts-ignore — added in parallel; run npx convex dev --once
      const reports = await convex.query(api.reports.getRecentReportsForAgent as any, {
        userId: userId as any,
        limit: 7,
      });
      return NextResponse.json({ reports });
    }

    if (type === "goals") {
      const goals = await convex.query(api.goals.getCurrentSummary as any, { userId });
      return NextResponse.json({ goals });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    console.error("agent/data error:", err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
