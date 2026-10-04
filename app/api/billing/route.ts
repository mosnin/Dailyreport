import { getServerUser } from "@/lib/serverAuth";
import { NextResponse } from "next/server";

const CREEM_API_URL = "https://api.creem.io/v1";

export async function POST() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.CREEM_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Payment not configured" }, { status: 500 });

  if (!user.creemCustomerId) {
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
