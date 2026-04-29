import { auth0 } from "@/lib/auth0";
import { redirect } from "next/navigation";
import { CheckCircle, BarChart3, Calendar, Sparkles } from "lucide-react";

export default async function LandingPage() {
  const session = await auth0.getSession();
  if (session) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <span className="text-xl font-bold tracking-tight">DailyReport</span>
        <div className="flex gap-3">
          <a
            href="/auth/login"
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Log in
          </a>
          <a
            href="/auth/login?screen_hint=signup"
            className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
          >
            Get started
          </a>
        </div>
      </nav>

      <section className="flex flex-col items-center text-center px-6 pt-20 pb-24 max-w-4xl mx-auto">
        <span className="inline-flex items-center gap-2 text-sm font-medium bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 rounded-full px-4 py-1.5 mb-8">
          <Sparkles className="w-4 h-4" />
          AI-powered accountability
        </span>
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6">
          Show up for yourself,
          <br />
          <span className="text-indigo-400">every single day.</span>
        </h1>
        <p className="text-lg text-slate-400 max-w-2xl mb-10">
          Daily and weekly check-ins with push reminders at 8pm. Track your consistency,
          review your progress on a calendar, and get AI insights from your own history.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="/auth/login?screen_hint=signup"
            className="px-8 py-3 font-semibold bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors text-lg"
          >
            Start for free
          </a>
          <a
            href="/auth/login"
            className="px-8 py-3 font-semibold border border-slate-700 hover:border-slate-500 rounded-xl transition-colors text-lg text-slate-300 hover:text-white"
          >
            Log in
          </a>
        </div>
      </section>

      <section className="px-6 pb-24 max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            icon: CheckCircle,
            title: "Daily & Weekly Reports",
            body: "Structured evening check-ins guided by questions that help you reflect and plan.",
          },
          {
            icon: BarChart3,
            title: "Accountability Dashboard",
            body: "See your submission accuracy, current streak, and progress at a glance.",
          },
          {
            icon: Calendar,
            title: "Calendar View",
            body: "Visual month grid showing every submitted, missed, or pending report day.",
          },
          {
            icon: Sparkles,
            title: "AI Insights & Search",
            body: "Chat with your report history and receive weekly AI-generated insights.",
          },
        ].map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-6"
          >
            <Icon className="w-7 h-7 text-indigo-400 mb-4" />
            <h3 className="font-semibold text-white mb-2">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
