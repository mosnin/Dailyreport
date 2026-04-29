"use client";

import { useConvexUser } from "@/hooks/useConvexUser";
import { OnboardingFlow } from "./OnboardingFlow";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { convexUser, convexUserId, isLoading } = useConvexUser();

  // Wait until user record is loaded (undefined = loading, null = not yet created)
  if (isLoading || convexUser === undefined || convexUser === null) return null;

  // Strict false check — undefined means existing user (grandfathered, skip onboarding)
  if (convexUser?.onboardingComplete === false && convexUserId) {
    return <OnboardingFlow userId={convexUserId} />;
  }

  return <>{children}</>;
}
