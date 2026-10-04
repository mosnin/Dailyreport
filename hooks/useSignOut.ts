"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export function useSignOut() {
  const { signOut } = useAuthActions();
  const router = useRouter();
  return useCallback(async () => {
    await signOut();
    router.push("/");
    router.refresh();
  }, [signOut, router]);
}
