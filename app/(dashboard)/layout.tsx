import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar />
        <main className="flex-1 p-6 max-w-5xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
