import { isAuthenticatedNextjs } from "@convex-dev/auth/nextjs/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
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
      "You can start for free today. The core loop - daily reports, weekly reports, calendar, goals - is free. Advanced AI features may move to a paid tier in the future.",
  },
  {
    question: "Who is this for?",
    answer:
      "People who want to improve at something over time and are honest enough to track themselves doing it. Founders, athletes, writers, parents - anyone who takes their own development seriously.",
  },
];

export default async function LandingPage() {
  const signedIn = await isAuthenticatedNextjs();
  if (signedIn) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Pill Header ────────────────────────────────────────────── */}
      <header className="fixed top-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <nav className="pointer-events-auto flex items-center gap-1 rounded-full bg-card px-2 py-2">
          <Link href="/" className="flex items-center px-3 mr-0.5">
            <Image
              src="/logo-dark.png"
              alt="DailyReport"
              width={1800}
              height={400}
              quality={100}
              className="h-5 w-auto"
              priority
            />
            <Image
              src="/logo-dark.png"
              alt="DailyReport"
              width={1800}
              height={400}
              quality={100}
              className="h-5 w-auto hidden"
              priority
            />
          </Link>

          <div className="h-4 w-px bg-accent mx-0.5" />

          <div className="hidden sm:flex items-center gap-0.5">
            <a
              href="#how-it-works"
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-full transition-colors"
            >
              How it works
            </a>
            <a
              href="#faq"
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-full transition-colors"
            >
              FAQ
            </a>
          </div>

          <div className="hidden sm:block h-4 w-px bg-accent mx-0.5" />

          <div className="flex items-center gap-1">
            <Link
              href="/sign-in"
              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-full transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="px-4 py-1.5 text-sm font-medium rounded-full bg-primary hover:opacity-90 text-primary-foreground transition-opacity"
            >
              Start free
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="flex min-h-[88vh] items-center justify-center px-6 pt-36 pb-24 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-heading mb-6 text-5xl leading-[1.04] sm:text-6xl lg:text-[4.75rem]">
            Measure your whole life.
            <br />
            Every day.
          </h1>

          <p className="mx-auto mb-10 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            Track health, goals, money, and growth.
            <br />
            One score for the life you are building.
          </p>

          <div className="flex items-center justify-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex items-center rounded-full bg-primary px-7 py-3.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Start for free
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex items-center rounded-full bg-secondary px-7 py-3.5 text-sm font-bold text-secondary-foreground transition-opacity hover:opacity-90"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ── One Truth ──────────────────────────────────────────────── */}
      <section className="px-6 py-24 bg-card">
        <div className="max-w-2xl mx-auto text-center">
          <p className="font-heading text-2xl sm:text-3xl leading-relaxed text-foreground">
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
            <div className="bento p-8">
              <div className="mb-6">
                <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/70 mb-1">
                  Wednesday evening
                </p>
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-none text-foreground">
                    April 29
                  </h2>
                  <span className="text-xs font-bold text-muted-foreground">
                    14 day streak
                  </span>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-1.5">
                    What did you do today?
                  </p>
                  <div className="h-11 rounded-full bg-background border border-border px-3 flex items-center">
                    <span className="text-sm text-muted-foreground/70">Shipped the onboarding flow…</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-1.5">
                    What drained you?
                  </p>
                  <div className="h-11 rounded-full bg-background border border-border px-3 flex items-center">
                    <span className="text-sm text-muted-foreground/70">The 3pm meeting that ran…</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider mb-1.5">
                    Plan for tomorrow
                  </p>
                  <div className="h-11 rounded-full bg-background border border-border px-3 flex items-center">
                    <span className="text-sm text-muted-foreground/70">Finish the auth flow by noon…</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    Saved
                  </div>
                  <div className="h-px flex-1 mx-4 bg-accent" />
                  <span className="text-[10px] text-muted-foreground/70">
                    Entry 214
                  </span>
                </div>
              </div>
            </div>

            {/* Facts */}
            <div className="space-y-8">
              {FACTS.map(({ number, body }) => (
                <div key={number} className="flex gap-5">
                  <span className="text-xs font-mono font-bold text-muted-foreground/70 mt-0.5 shrink-0 w-5">
                    {number}
                  </span>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                    {body}
                  </p>
                </div>
              ))}

              <div className="pt-4">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:opacity-90 text-primary-foreground font-bold text-sm transition-colors"
                >
                  Begin tonight
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
          <p className="text-muted-foreground text-sm mb-10 max-w-sm mx-auto">
            Setup takes two minutes. Your first report takes less than five.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary hover:opacity-90 text-primary-foreground font-medium text-sm transition-opacity"
          >
            Start for free
          </Link>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────── */}
      <section
        id="faq"
        className="px-6 py-24 bg-card"
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
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 rounded-full border border-border bg-card px-7 py-3.5">
          <Image
            src="/logo-dark.png"
            alt="DailyReport"
            width={1800}
            height={400}
            quality={100}
            className="h-5 w-auto"
          />
          <Image
            src="/logo-dark.png"
            alt="DailyReport"
            width={1800}
            height={400}
            quality={100}
            className="h-5 w-auto hidden"
          />
          <div className="hidden sm:block h-3.5 w-px bg-border" />
          <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
            <Link
              href="/sign-in"
              className="hover:text-foreground transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/sign-up"
              className="hover:text-foreground transition-colors"
            >
              Sign up
            </Link>
            <a
              href="#how-it-works"
              className="hover:text-foreground transition-colors"
            >
              How it works
            </a>
            <a
              href="#faq"
              className="hover:text-foreground transition-colors"
            >
              FAQ
            </a>
            <span className="text-muted-foreground/70">
              © {new Date().getFullYear()} DailyReport
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
