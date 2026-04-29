"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { DreamsClient } from "./DreamsClient";

export function DreamsWrapper() {
  const { convexUserId, convexUser, isLoading } = useConvexUser();
  const migrate = useMutation(api.users.migrateLifelongGoals);
  const migrated = useRef(false);

  useEffect(() => {
    if (!convexUserId || !convexUser) return;
    if (convexUser.lifelongMigrated) return;
    if (migrated.current) return;
    migrated.current = true;
    migrate({ userId: convexUserId }).catch(() => { migrated.current = false; });
  }, [convexUserId, convexUser, migrate]);

  if (isLoading || !convexUserId) {
    return null;
  }

  return <DreamsClient userId={convexUserId} />;
}
