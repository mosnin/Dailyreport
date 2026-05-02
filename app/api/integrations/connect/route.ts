import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

function getAuthConfigId(platform: string): string | null {
  const envKey = `COMPOSIO_AUTH_CONFIG_ID_${platform.toUpperCase()}`;
  const value = process.env[envKey]?.trim();
  return value && value.length > 0 ? value : null;
}

function getRedirectUrl(payload: any): string | null {
  return (
    payload?.redirect_url ??
    payload?.redirectUrl ??
    payload?.data?.redirect_url ??
    payload?.data?.redirectUrl ??
    null
  );
}

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

  const authConfigId = getAuthConfigId(platform);
  if (!authConfigId) {
    const envKey = `COMPOSIO_AUTH_CONFIG_ID_${platform}`;
    console.error(`[integrations/connect] Missing auth config id env: ${envKey}`);
    return NextResponse.json(
      {
        error: "Composio auth config is not configured for this platform",
        details: `Missing ${envKey}`,
      },
      { status: 500 }
    );
  }

  const envAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const url = new URL(req.url);
  const fallbackOrigin = `${url.protocol}//${url.host}`;
  const appUrl = envAppUrl || fallbackOrigin;
  const callbackUrl = `${appUrl}/integrations?platform=${platform.toLowerCase()}`;

  try {
    const res = await fetch("https://backend.composio.dev/api/v3/connected_accounts/link", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": composioApiKey,
      },
      body: JSON.stringify({
        auth_config_id: authConfigId,
        user_id: userId,
        callback_url: callbackUrl,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error(`[integrations/connect] Composio v3 error ${res.status}:`, data);
      return NextResponse.json({ error: "Composio connection failed", details: data }, { status: 502 });
    }

    const redirectUrl = getRedirectUrl(data);
    if (!redirectUrl) {
      return NextResponse.json({ error: "Composio returned no redirect URL", raw: data }, { status: 502 });
    }

    if (mode === "redirect") {
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.json({ redirectUrl });
  } catch (error) {
    console.error("[integrations/connect] Failed to initiate connection", error);
    return NextResponse.json({ error: "Failed to initiate connection" }, { status: 502 });
  }
}
