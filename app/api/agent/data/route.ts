import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.MODAL_AGENT_SECRET ?? "";
  if (!authHeader || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const type = searchParams.get("type");

  if (!userId || !type) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    if (type === "goals") {
      // getCurrentSummary returns completion stats across all time horizons
      const goals = await convex.query(api.goals.getCurrentSummary as any, { userId });
      return NextResponse.json({ goals });
    }
    // For reports, return empty for now — agent will use what's available
    return NextResponse.json({ data: null });
  } catch {
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
