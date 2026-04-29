"use client";

const TESTIMONIALS = [
  {
    quote: "I've tried every journaling app. This is the first one I've actually kept up with past two weeks.",
    name: "Alex R.",
  },
  {
    quote: "The weekly AI insight alone changed how I think about my time. It noticed a pattern I'd been ignoring for months.",
    name: "Sarah K.",
  },
  {
    quote: "Three months in, 79-day streak. I didn't know I was capable of that kind of consistency.",
    name: "Marcus T.",
  },
  {
    quote: "Something about the calendar filling in green keeps me coming back every single day.",
    name: "Priya N.",
  },
  {
    quote: "Seeing lifelong goals next to this week's goals is clarifying in a way nothing else has been.",
    name: "James W.",
  },
  {
    quote: "I started filling it out just to try it. Now it feels strange not to.",
    name: "Diana L.",
  },
  {
    quote: "It treats reflection like the serious practice it is. Not a self-care gimmick.",
    name: "Tom H.",
  },
  {
    quote: "The problems tracker showed me I've been circling the same three issues for two months. Uncomfortable and necessary.",
    name: "Rachel S.",
  },
];

const doubled = [...TESTIMONIALS, ...TESTIMONIALS];

export function TestimonialMarquee() {
  return (
    <section className="py-24 overflow-hidden">
      <div className="mb-14 text-center px-6">
        <h2 className="text-3xl font-semibold tracking-tight mb-3">What people say</h2>
        <p className="text-neutral-500 dark:text-neutral-400 text-base max-w-sm mx-auto">
          From people who show up every day.
        </p>
      </div>

      <div
        className="flex gap-4"
        style={{
          animation: "marquee-scroll 36s linear infinite",
          width: "max-content",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.animationPlayState = "paused";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.animationPlayState = "running";
        }}
      >
        {doubled.map((t, i) => (
          <div
            key={i}
            className="w-72 shrink-0 rounded-2xl border border-neutral-200 dark:border-white/8 bg-white dark:bg-neutral-900 p-5 flex flex-col gap-3"
          >
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
              &ldquo;{t.quote}&rdquo;
            </p>
            <span className="text-xs text-neutral-400 dark:text-neutral-500 font-medium mt-auto">
              — {t.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
