import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <OnboardingGate>
      <div className="flex min-h-screen items-start">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 min-h-screen">
          <Navbar />
          <main className="flex-1 p-4 md:p-6 max-w-5xl w-full mx-auto">{children}</main>
        </div>
      </div>
    </OnboardingGate>
  );
}
