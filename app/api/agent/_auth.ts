import { NextResponse } from "next/server";

export function authorizeModalRequest(req: Request): { ok: true } | { ok: false; response: NextResponse } {
  const authHeader = req.headers.get("authorization");
  const secretHeader = req.headers.get("x-modal-secret");
  const secret = process.env.MODAL_AGENT_SECRET ?? "";

  const authorized = authHeader === `Bearer ${secret}` || secretHeader === secret;
  if (authorized) return { ok: true };

  const requestId = crypto.randomUUID();
  console.error("[agent/auth] unauthorized callback", {
    requestId,
    path: new URL(req.url).pathname,
    hasAuthorizationHeader: Boolean(authHeader),
    hasSecretHeader: Boolean(secretHeader),
    secretConfigured: Boolean(secret),
  });

  return {
    ok: false,
    response: NextResponse.json({ error: "Unauthorized", requestId }, { status: 401 }),
  };
}
