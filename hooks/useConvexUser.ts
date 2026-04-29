"use client";

import { useUser } from "@auth0/nextjs-auth0";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export function useConvexUser() {
  const { user: auth0User, isLoading: auth0Loading } = useUser();
  const [convexUserId, setConvexUserId] = useState<Id<"users"> | null>(null);
  const getOrCreate = useMutation(api.users.getOrCreate);

  const convexUser = useQuery(
    api.users.getByAuth0Sub,
    auth0User?.sub ? { auth0Sub: auth0User.sub } : "skip"
  );

  useEffect(() => {
    if (!auth0User?.sub) return;
    getOrCreate({
      auth0Sub: auth0User.sub,
      email: auth0User.email ?? "",
      name: auth0User.name ?? auth0User.email ?? "",
    }).then(setConvexUserId);
  }, [auth0User?.sub, getOrCreate]);

  return {
    auth0User,
    convexUser,
    convexUserId: convexUserId ?? convexUser?._id ?? null,
    isLoading: auth0Loading,
  };
}
