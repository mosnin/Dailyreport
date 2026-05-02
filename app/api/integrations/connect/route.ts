import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform")?.toUpperCase();
  const mode = searchParams.get("mode") ?? "json";
  if (!platform) return NextResponse.json({ error: "Missing platform" }, { status: 400 });

  const composioApiKey = process.env.COMPOSIO_API_KEY;
  if (!composioApiKey) {
    return NextResponse.json({ error: "Composio not configured" }, { status: 503 });
  }

  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = new URL(req.url);
  const fallbackOrigin = `${url.protocol}//${url.host}`;
  const appUrl = envAppUrl || fallbackOrigin;
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
    if (!res.ok) {
      const text = await res.text();
      console.error(`Composio error ${res.status}:`, text);
      return NextResponse.json({ error: "Composio connection failed" }, { status: 502 });
    }
    const data = await res.json();
    const redirectUrl = data.redirectUrl ?? data.redirect_url ?? null;
    if (!redirectUrl) {
      return NextResponse.json({ error: "Composio returned no redirect URL", raw: data }, { status: 502 });
    }
    if (mode === "redirect") {
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.json({ redirectUrl });
  } catch {
    return NextResponse.json({ error: "Failed to initiate connection" }, { status: 502 });
  }
}
