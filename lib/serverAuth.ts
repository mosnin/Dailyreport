import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

// The signed-in user's Convex profile for route handlers, or null.
export async function getServerUser() {
  const token = await convexAuthNextjsToken();
  if (!token) return null;
  try {
    return await fetchQuery(api.users.current, {}, { token });
  } catch {
    return null;
  }
}
