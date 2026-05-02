"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export function useConvexUser() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const { isAuthenticated, isLoading: convexAuthLoading } = useConvexAuth();
  const [convexUserId, setConvexUserId] = useState<Id<"users"> | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const getOrCreate = useMutation(api.users.getOrCreate);

  const convexUser = useQuery(
    api.users.getByClerkId,
    isAuthenticated && clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  useEffect(() => {
    if (!isAuthenticated || !clerkUser?.id) return;
    getOrCreate({
      email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
      name: clerkUser.fullName ?? clerkUser.primaryEmailAddress?.emailAddress ?? "",
    })
      .then((id) => {
        setConvexUserId(id);
        setCreateError(null);
      })
      .catch((err) => {
        console.error("Convex getOrCreate failed:", err);
        setCreateError(err instanceof Error ? err.message : "Failed to create user");
      });
  }, [isAuthenticated, clerkUser?.id, getOrCreate]);

  return {
    clerkUser,
    convexUser,
    convexUserId: convexUserId ?? convexUser?._id ?? null,
    isLoading: !clerkLoaded || convexAuthLoading,
    isAuthenticated,
    createError,
  };
}
