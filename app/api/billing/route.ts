import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const CREEM_API_URL = "https://api.creem.io/v1";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.CREEM_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Payment not configured" }, { status: 500 });

  // Look up the user's creemCustomerId from Convex
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const user = await convex.query(api.users.getByClerkId, { clerkId: userId });

  if (!user?.creemCustomerId) {
    return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
  }

  const res = await fetch(`${CREEM_API_URL}/customers/billing`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ customer_id: user.creemCustomerId }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Creem billing portal error:", text);
    return NextResponse.json({ error: "Failed to get billing portal" }, { status: 502 });
  }

  const data = (await res.json()) as { customer_portal_link: string };
  return NextResponse.json({ portalUrl: data.customer_portal_link });
}
