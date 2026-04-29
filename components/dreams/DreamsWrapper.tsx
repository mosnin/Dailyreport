"use client";

import { useConvexUser } from "@/hooks/useConvexUser";
import { DreamsClient } from "./DreamsClient";

export function DreamsWrapper() {
  const { convexUserId, isLoading } = useConvexUser();

  if (isLoading || !convexUserId) {
    return null;
  }

  return <DreamsClient userId={convexUserId} />;
}
