import type { UserIdentity } from "convex/server";
import type { Id } from "./_generated/dataModel";

// Convex Auth issues JWTs whose subject is "<userId>|<sessionId>".
export function authUserId(identity: UserIdentity): Id<"users"> {
  return identity.subject.split("|")[0] as Id<"users">;
}
