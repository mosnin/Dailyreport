import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Flame, CheckCircle2 } from "lucide-react";
import { TestimonialMarquee } from "@/components/landing/TestimonialMarquee";
import { FAQ } from "@/components/landing/FAQ";

const FACTS = [
  {
    number: "01",
    body: "Seven questions every evening. Structured, not open-ended. Takes less than five minutes.",
  },
  {
    number: "02",
    body: "A calendar that doesn't lie. Every submitted day is green. Every missed day stays red.",
  },
  {
    number: "03",
    body: "AI reads your full history each week. Patterns surface that you can't see from inside the work.",
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
              href="#how-it-works"
              className="px-3 py-1.5 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-full transition-colors"
            >
              How it works
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
              className="px-4 py-1.5 text-sm font-medium rounded-full bg-brand-blue hover:opacity-90 text-white transition-opacity"
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
          <h1 className="font-heading text-5xl sm:text-6xl lg:text-[4.5rem] font-semibold tracking-tight leading-[1.06] mb-6">
            Show up in writing.
            <br />
            <span className="text-brand-blue">Every day.</span>
          </h1>

          <p className="text-base sm:text-lg text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-lg mx-auto mb-10">
            Seven questions. Every night.
            <br />
            A year from now, you&rsquo;ll have proof.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-brand-blue hover:opacity-90 text-white font-medium text-sm transition-opacity shadow-lg shadow-brand-blue/25"
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

      {/* ── One Truth ──────────────────────────────────────────────── */}
      <section className="px-6 py-24 bg-neutral-50 dark:bg-[#0d0d12]">
        <div className="max-w-2xl mx-auto text-center">
          <p className="font-heading italic text-2xl sm:text-3xl leading-relaxed text-neutral-700 dark:text-neutral-300">
            &ldquo;Most people know what to do. Almost no one keeps a written
            record of whether they did it.&rdquo;
          </p>
        </div>
      </section>

      {/* ── Product Preview + Facts ─────────────────────────────────── */}
      <section id="how-it-works" className="px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Mockup */}
            <div className="notebook-lines rounded-2xl ring-1 ring-foreground/10 bg-white dark:bg-neutral-900 p-8">
              <div className="mb-6">
                <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-neutral-400 dark:text-neutral-500 mb-1">
                  Wednesday evening
                </p>
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-none text-neutral-900 dark:text-neutral-100">
                    April 29
                  </h2>
                  <span className="flex items-center gap-1 text-xs font-semibold text-orange-500">
                    <Flame className="w-3.5 h-3.5" />
                    14d streak
                  </span>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5">
                    What did you do today?
                  </p>
                  <div className="h-10 rounded-lg bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/8 px-3 flex items-center">
                    <span className="text-sm text-neutral-400 dark:text-neutral-600">Shipped the onboarding flow…</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5">
                    What drained you?
                  </p>
                  <div className="h-10 rounded-lg bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/8 px-3 flex items-center">
                    <span className="text-sm text-neutral-400 dark:text-neutral-600">The 3pm meeting that ran…</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5">
                    Plan for tomorrow
                  </p>
                  <div className="h-10 rounded-lg bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/8 px-3 flex items-center">
                    <span className="text-sm text-neutral-400 dark:text-neutral-600">Finish the auth flow by noon…</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Saved
                  </div>
                  <div className="h-px flex-1 mx-4 bg-neutral-100 dark:bg-white/5" />
                  <span className="text-[10px] text-neutral-300 dark:text-neutral-600">
                    Entry 214
                  </span>
                </div>
              </div>
            </div>

            {/* Facts */}
            <div className="space-y-8">
              {FACTS.map(({ number, body }) => (
                <div key={number} className="flex gap-5">
                  <span className="text-xs font-mono font-bold text-brand-blue mt-0.5 shrink-0 w-5">
                    {number}
                  </span>
                  <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {body}
                  </p>
                </div>
              ))}

              <div className="pt-4">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-900 dark:bg-white hover:bg-neutral-700 dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-medium text-sm transition-colors"
                >
                  Begin tonight
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────────────── */}
      <TestimonialMarquee />

      {/* ── Mid-page CTA ───────────────────────────────────────────── */}
      <section className="px-6 py-28 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-heading text-4xl font-semibold tracking-tight mb-4">
            The work starts tonight.
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-10 max-w-sm mx-auto">
            Setup takes two minutes. Your first report takes less than five.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-brand-blue hover:opacity-90 text-white font-medium text-sm transition-opacity shadow-xl shadow-brand-blue/20"
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
            <h2 className="font-heading text-3xl font-semibold tracking-tight mb-3">
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
              href="#how-it-works"
              className="hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
            >
              How it works
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
