"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

// The signed-in user's Convex profile. Convex Auth creates it on first sign-in.
export function useConvexUser() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const convexUser = useQuery(api.users.current, isAuthenticated ? {} : "skip");

  return {
    convexUser,
    convexUserId: convexUser?._id ?? null,
    isLoading: authLoading || (isAuthenticated && convexUser === undefined),
    isAuthenticated,
  };
}

export function firstNameOf(user: { name?: string; email?: string } | null | undefined) {
  const name = user?.name?.trim();
  if (name && name !== user?.email) return name.split(/\s+/)[0];
  return null;
}
