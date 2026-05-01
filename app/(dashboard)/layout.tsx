import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { PageTransition } from "@/components/layout/PageTransition";
import { CommandPalette } from "@/components/CommandPalette";
import { KeyboardNavMount } from "@/components/layout/KeyboardNavMount";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <OnboardingGate>
      <div className="flex min-h-screen items-start">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 min-h-screen">
          <Navbar />
          <main className="flex-1 p-4 md:p-6 with-bottom-tabs">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
      <BottomTabBar />
      <CommandPalette />
      <KeyboardNavMount />
    </OnboardingGate>
  );
}
