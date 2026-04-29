import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth0";

export default async function SignupPage() {
  const session = await auth0.getSession();
  if (session) redirect("/dashboard");
  redirect("/auth/login?screen_hint=signup");
}
