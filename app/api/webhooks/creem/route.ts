import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  const secret = process.env.CREEM_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });

  const rawBody = await req.text();
  const signature = req.headers.get("creem-signature") ?? "";

  if (!signature || !verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: {
    eventType: string;
    object: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  if (event.eventType === "checkout.completed" || event.eventType === "subscription.active") {
    const clerkId =
      (event.metadata?.clerkId as string) ??
      (event.object?.metadata as Record<string, unknown> | undefined)?.clerkId as string;

    const subscription = event.object?.subscription as Record<string, unknown> | undefined;
    const customer = event.object?.customer as Record<string, unknown> | undefined;
    const subId =
      subscription?.id as string ??
      event.object?.id as string;
    const customerId = customer?.id as string ?? event.object?.customer_id as string;

    if (clerkId && subId && customerId) {
      await convex.mutation(api.subscriptions.activateProPlan, {
        clerkId,
        creemCustomerId: customerId,
        creemSubscriptionId: subId,
      });
    }
  } else if (
    event.eventType === "subscription.canceled" ||
    event.eventType === "subscription.expired"
  ) {
    const subId = event.object?.id as string;
    if (subId) {
      await convex.mutation(api.subscriptions.cancelProPlan, {
        creemSubscriptionId: subId,
      });
    }
  }

  return NextResponse.json({ received: true });
}
