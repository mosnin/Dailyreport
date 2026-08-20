import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { PageTransition } from "@/components/layout/PageTransition";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardNavMount } from "@/components/layout/KeyboardNavMount";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { DitherBackground } from "@/components/DitherBackground";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <OnboardingGate>
      <DitherBackground />
      <div className="relative z-10 flex min-h-screen items-start">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 min-h-screen">
          <Navbar />
          <main className="flex-1 px-4 pt-0 pb-6 md:px-8 md:pt-4 md:pb-8 with-bottom-tabs">
            <div className="mx-auto w-full max-w-6xl">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
      </div>
      <BottomTabBar />
      <CommandPalette />
      <KeyboardNavMount />
      <PWAInstallBanner />
    </OnboardingGate>
  );
}
