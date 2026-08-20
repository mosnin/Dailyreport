"use client";

import { useConvexUser } from "@/hooks/useConvexUser";

/**
 * Onboarding is now tracker-first: a new user lands in the app and the Today
 * page's first-run ("what do you want to track?") sets everything up. This gate
 * just waits for the user record so we don't flash an empty shell.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { convexUser, isLoading } = useConvexUser();
  if (isLoading || convexUser === undefined || convexUser === null) return null;
  return <>{children}</>;
}
