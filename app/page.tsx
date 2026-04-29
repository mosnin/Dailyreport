import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Calendar,
  Target,
  Sparkles,
  Bell,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { TestimonialMarquee } from "@/components/landing/TestimonialMarquee";
import { FAQ } from "@/components/landing/FAQ";

const WHY = [
  {
    number: "01",
    title: "Structure beats motivation",
    body: "A consistent set of questions each evening removes the decision of what to reflect on. You don't decide to journal — you just answer what's in front of you.",
  },
  {
    number: "02",
    title: "Your data tells a story",
    body: "Every submission builds a picture. Watch your streak, consistency, and patterns accumulate over weeks and months into something you can actually learn from.",
  },
  {
    number: "03",
    title: "Accountability changes behavior",
    body: "Knowing you'll have to report on your day changes how you spend it. That's not a side effect. It's the mechanism.",
  },
];

const FEATURES = [
  {
    icon: BookOpen,
    title: "Daily Report",
    body: "Seven structured questions every evening covering your day, who you met, your goals, what drained you, and your plan for tomorrow.",
  },
  {
    icon: TrendingUp,
    title: "Weekly Review",
    body: "A weekly report that surfaces patterns across the days and sets clear intention for the week ahead.",
  },
  {
    icon: Calendar,
    title: "Calendar Heatmap",
    body: "A visual record of every day you showed up. Green is earned. Missed days stay red. The data doesn't lie.",
  },
  {
    icon: Target,
    title: "Goal Tracker",
    body: "Five time horizons — lifelong, yearly, quarterly, monthly, weekly — all visible and connected in one place.",
  },
  {
    icon: Sparkles,
    title: "AI Insights",
    body: "Your full report history analyzed each week. Patterns surface that you can't see day-to-day from inside the work.",
  },
  {
    icon: Bell,
    title: "8pm Reminders",
    body: "A consistent push notification in your own timezone. No algorithm. No noise. Just the reminder that it's time.",
  },
];

const FAQS = [
  {
    question: "What are the daily questions?",
    answer:
      "Seven structured questions covering your day's activity, who you met, your goals for the day, what drained you emotionally, problems you're working through, whether you did your affirmations, and your plan for tomorrow.",
  },
  {
    question: "Is there a mobile app?",
    answer:
      "It's a PWA (Progressive Web App). On iPhone, open it in Safari and tap \"Add to Home Screen.\" On Android, Chrome prompts you automatically. It installs like a native app and works offline.",
  },
  {
    question: "How does the AI work?",
    answer:
      "Your reports are stored securely. Once per week, an AI model reads your full history and writes a short insight about your patterns and progress. Semantic search lets you query your own history across months of entries.",
  },
  {
    question: "What if I miss a day?",
    answer:
      "Miss days. The accuracy percentage and calendar don't lie to you. Seeing a missed day in red is more useful than an app that pretends everything is fine. The data is honest so you can be.",
  },
  {
    question: "Is it free?",
    answer:
      "You can start for free today. The core loop — daily reports, weekly reports, calendar, goals — is free. Advanced AI features may move to a paid tier in the future.",
  },
  {
    question: "Who is this for?",
    answer:
      "People who want to improve at something over time and are honest enough to track themselves doing it. Founders, athletes, writers, parents — anyone who takes their own development seriously.",
  },
];

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">

      {/* ── Pill Header ────────────────────────────────────────────── */}
      <header className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav className="pointer-events-auto flex items-center gap-1 rounded-full border border-neutral-200 dark:border-white/10 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md px-2 py-2 shadow-sm shadow-black/5">
          <Link href="/" className="flex items-center px-3 mr-0.5">
            <Image
              src="/logo-light.png"
              alt="DailyReport"
              width={1800}
              height={400}
              quality={100}
              className="h-5 w-auto dark:hidden"
              priority
            />
            <Image
              src="/logo-dark.png"
              alt="DailyReport"
              width={1800}
              height={400}
              quality={100}
              className="h-5 w-auto hidden dark:block"
              priority
            />
          </Link>

          <div className="h-4 w-px bg-neutral-200 dark:bg-white/10 mx-0.5" />

          <div className="hidden sm:flex items-center gap-0.5">
            <a
              href="#features"
              className="px-3 py-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full transition-colors"
            >
              Features
            </a>
            <a
              href="#faq"
              className="px-3 py-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full transition-colors"
            >
              FAQ
            </a>
          </div>

          <div className="hidden sm:block h-4 w-px bg-neutral-200 dark:bg-white/10 mx-0.5" />

          <div className="flex items-center gap-1">
            <Link
              href="/sign-in"
              className="px-3 py-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-1.5 text-sm font-medium rounded-full bg-sky-500 hover:bg-sky-400 text-white transition-colors"
            >
              Start free
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="notebook-lines pt-40 pb-32 px-6 text-center relative">
        {/* Left margin rule */}
        <div className="absolute left-[max(2.5rem,calc(50%-38rem))] top-0 bottom-0 w-px bg-red-200/50 dark:bg-red-900/20 pointer-events-none" />

        <div className="max-w-3xl mx-auto relative">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 rounded-full px-3.5 py-1.5 mb-10">
            Daily · Weekly · AI
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-[4.5rem] font-semibold tracking-tight leading-[1.06] mb-6">
            Show up in writing.
            <br />
            <span className="text-sky-500 dark:text-sky-400">Every day.</span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-lg mx-auto mb-10">
            Daily and weekly check-ins that build a picture of who you are, where
            you&rsquo;re going, and whether you&rsquo;re actually doing the work.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm transition-colors shadow-lg shadow-sky-500/25"
            >
              Start for free
              <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center px-6 py-3 rounded-full border border-neutral-200 dark:border-white/10 hover:bg-neutral-50 dark:hover:bg-white/5 text-neutral-600 dark:text-neutral-400 font-medium text-sm transition-colors"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Why it works ───────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-semibold tracking-tight mb-3">
              Why it works
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-xs mx-auto">
              Most journaling fails because it&rsquo;s open-ended. This isn&rsquo;t that.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {WHY.map(({ number, title, body }) => (
              <div
                key={number}
                className="rounded-2xl border border-neutral-200 dark:border-white/8 bg-neutral-50 dark:bg-neutral-900 p-6"
              >
                <span className="text-xs font-mono font-semibold text-sky-500 dark:text-sky-400 mb-4 block">
                  {number}
                </span>
                <h3 className="text-sm font-semibold mb-2 text-neutral-900 dark:text-neutral-100">
                  {title}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section
        id="features"
        className="px-6 py-24 bg-neutral-50 dark:bg-[#0d0d12]"
      >
        <div className="max-w-5xl mx-auto">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-semibold tracking-tight mb-3">
              Everything in one place
            </h2>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-xs mx-auto">
              The full accountability loop. Nothing you don&rsquo;t need.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-neutral-200 dark:border-white/8 bg-white dark:bg-neutral-900 p-6"
              >
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-500/10 flex items-center justify-center mb-4">
                  <Icon className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5 text-neutral-900 dark:text-neutral-100">
                  {title}
                </h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────── */}
      <TestimonialMarquee />

      {/* ── Mid-page CTA ───────────────────────────────────────────── */}
      <section className="px-6 py-28 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-4xl font-semibold tracking-tight mb-4">
            The work starts tonight.
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-10 max-w-sm mx-auto">
            Setup takes two minutes. Your first report takes less than five.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm transition-colors shadow-xl shadow-sky-500/20"
          >
            Start for free
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────── */}
      <section
        id="faq"
        className="px-6 py-24 bg-neutral-50 dark:bg-[#0d0d12]"
      >
        <div className="max-w-2xl mx-auto">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-semibold tracking-tight mb-3">
              Questions
            </h2>
          </div>
          <FAQ items={FAQS} />
        </div>
      </section>

      {/* ── Pill Footer ────────────────────────────────────────────── */}
      <footer className="py-10 px-4 flex justify-center">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-full border border-neutral-200 dark:border-white/8 bg-neutral-50 dark:bg-neutral-900 px-7 py-3.5">
          <Image
            src="/logo-light.png"
            alt="DailyReport"
            width={1800}
            height={400}
            quality={100}
            className="h-5 w-auto dark:hidden"
          />
          <Image
            src="/logo-dark.png"
            alt="DailyReport"
            width={1800}
            height={400}
            quality={100}
            className="h-5 w-auto hidden dark:block"
          />
          <div className="hidden sm:block h-3.5 w-px bg-neutral-300 dark:bg-white/10" />
          <div className="flex items-center gap-4 text-xs text-neutral-400 dark:text-neutral-500">
            <Link
              href="/sign-in"
              className="hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            >
              Sign up
            </Link>
            <a
              href="#features"
              className="hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            >
              Features
            </a>
            <a
              href="#faq"
              className="hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            >
              FAQ
            </a>
            <span className="text-neutral-300 dark:text-neutral-700">
              © {new Date().getFullYear()} DailyReport
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
