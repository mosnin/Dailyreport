import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const CREEM_API_URL = "https://api.creem.io/v1";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.CREEM_API_KEY;
  const productId = process.env.CREEM_PRODUCT_ID;
  if (!apiKey || !productId) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 500 });
  }

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL?.replace("convex.cloud", "vercel.app") ?? "http://localhost:3000";

  const body: Record<string, unknown> = {
    product_id: productId,
    success_url: `${baseUrl}/settings?subscription=success`,
    metadata: { clerkId: userId },
  };
  if (email) body.customer = { email };

  const res = await fetch(`${CREEM_API_URL}/checkouts`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Creem checkout error:", text);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 502 });
  }

  const data = (await res.json()) as { checkout_url: string };
  return NextResponse.json({ checkoutUrl: data.checkout_url });
}
