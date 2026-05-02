import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform")?.toUpperCase();
  if (!platform) return NextResponse.json({ error: "Missing platform" }, { status: 400 });

  const composioApiKey = process.env.COMPOSIO_API_KEY;
  if (!composioApiKey) {
    return NextResponse.json({ error: "Composio not configured" }, { status: 503 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const redirectUri = `${appUrl}/integrations`;

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
        userUuid: userId,
        data: { redirectParams: `platform=${platform.toLowerCase()}` },
      }),
    });
    const data = await res.json();
    return NextResponse.json({ redirectUrl: data.redirectUrl ?? data.redirect_url ?? null });
  } catch {
    return NextResponse.json({ error: "Failed to initiate connection" }, { status: 502 });
  }
}
