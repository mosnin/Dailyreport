import { getServerUser } from "@/lib/serverAuth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform")?.toUpperCase();
  if (!platform) return NextResponse.json({ error: "Missing platform" }, { status: 400 });

  const composioApiKey = process.env.COMPOSIO_API_KEY;
  if (!composioApiKey) {
    return NextResponse.json({ error: "Composio not configured" }, { status: 503 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const redirectUri = `${appUrl}/settings`;

  try {
    const res = await fetch("https://backend.composio.dev/api/v1/connectedAccounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": composioApiKey,
      },
      body: JSON.stringify({
        integrationId: platform,
        redirectUri,
        // Accounts from before Convex Auth keep their Clerk id as the Composio entity.
        userUuid: user.clerkId ?? user._id,
        data: { redirectParams: `platform=${platform.toLowerCase()}` },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Composio error ${res.status}:`, text);
      return NextResponse.json({ error: "Composio connection failed" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json({
      redirectUrl: data.redirectUrl ?? data.redirect_url ?? null,
      connectionId: data.id ?? data.connectionId ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to initiate connection" }, { status: 502 });
  }
}
