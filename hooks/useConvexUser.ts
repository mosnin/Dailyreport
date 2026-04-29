"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export function useConvexUser() {
  const { user: clerkUser, isLoaded } = useUser();
  const [convexUserId, setConvexUserId] = useState<Id<"users"> | null>(null);
  const getOrCreate = useMutation(api.users.getOrCreate);

  const convexUser = useQuery(
    api.users.getByClerkId,
    clerkUser?.id ? { clerkId: clerkUser.id } : "skip"
  );

  useEffect(() => {
    if (!clerkUser?.id) return;
    getOrCreate({
      clerkId: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
      name: clerkUser.fullName ?? clerkUser.primaryEmailAddress?.emailAddress ?? "",
    }).then(setConvexUserId);
  }, [clerkUser?.id, getOrCreate]);

  return {
    clerkUser,
    convexUser,
    convexUserId: convexUserId ?? convexUser?._id ?? null,
    isLoading: !isLoaded,
  };
}
