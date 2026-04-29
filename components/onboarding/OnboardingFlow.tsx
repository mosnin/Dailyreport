"use client";

import { useState, useEffect } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { Plus, X, ChevronRight, Loader2, Sparkles, Check } from "lucide-react";

function fireSideCannon() {
  const colors = ["#bb0000", "#0000ee"];
  const end = Date.now() + 5 * 1000;
  function frame() {
    confetti({ particleCount: 2, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 2, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

const TIMEZONES = Intl.supportedValuesOf
  ? Intl.supportedValuesOf("timeZone")
  : [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Anchorage",
      "Pacific/Honolulu",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Asia/Kolkata",
      "Australia/Sydney",
      "Pacific/Auckland",
    ];

const STEPS = [
  { title: "About You", subtitle: "Tell us who you are and what drives you" },
  { title: "Life Goals", subtitle: "What are you working toward in the long run?" },
  { title: "This Year", subtitle: "What's your main focus for this year?" },
  { title: "Your Timezone", subtitle: "We'll send reminders at 8pm in your local time" },
];

interface Props {
  userId: Id<"users">;
}

export function OnboardingFlow({ userId }: Props) {
  const [step, setStep] = useState(0);
  const [bio, setBio] = useState("");
  const [lifeGoals, setLifeGoals] = useState<string[]>([""]);
  const [yearlyGoal, setYearlyGoal] = useState("");
  const [timezone, setTimezone] = useState(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const completeOnboarding = useMutation(api.users.completeOnboarding);
  const generateAffirmations = useAction(api.ai.generateOnboardingAffirmations);

  function addGoal() {
    if (lifeGoals.length < 5) setLifeGoals([...lifeGoals, ""]);
  }

  function updateGoal(i: number, value: string) {
    const updated = [...lifeGoals];
    updated[i] = value;
    setLifeGoals(updated);
  }

  function removeGoal(i: number) {
    if (lifeGoals.length === 1) {
      setLifeGoals([""]);
    } else {
      setLifeGoals(lifeGoals.filter((_, idx) => idx !== i));
    }
  }

  function canAdvance() {
    if (step === 0) return bio.trim().length > 0;
    if (step === 1) return lifeGoals.some((g) => g.trim().length > 0);
    if (step === 2) return yearlyGoal.trim().length > 0;
    if (step === 3) return Boolean(timezone);
    return false;
  }

  async function handleFinish() {
    setSubmitting(true);
    setError(null);
    try {
      const validGoals = lifeGoals.filter((g) => g.trim());
      await completeOnboarding({
        userId,
        bio,
        timezone,
        lifeGoals: validGoals,
        yearlyGoal,
      });
      try {
        await generateAffirmations({ userId, bio, lifeGoals: validGoals, yearlyGoal });
      } catch {
        // affirmation failure is non-fatal
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (done) fireSideCannon();
  }, [done]);

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Check className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">You're all set!</h1>
            <p className="text-muted-foreground mt-2">
              Your goals and personalized affirmations are ready. Start your first daily report.
            </p>
          </div>
          <a
            href="/reports/daily"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Start First Report
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      <div className="max-w-lg w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-primary">Welcome</span>
          </div>
          <h1 className="text-2xl font-bold">{STEPS[step].title}</h1>
          <p className="text-muted-foreground">{STEPS[step].subtitle}</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === step
                  ? "w-6 bg-primary"
                  : i < step
                  ? "w-2 bg-primary/50"
                  : "w-2 bg-border"
              )}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          {step === 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Tell us about yourself
              </label>
              <textarea
                autoFocus
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What are you working toward in life? What drives you? What kind of person are you becoming?"
                rows={5}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Be honest and personal — this helps personalize your affirmations.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <label className="text-sm font-medium">
                Your lifelong goals (up to 5)
              </label>
              <div className="space-y-2">
                {lifeGoals.map((goal, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      autoFocus={i === 0}
                      type="text"
                      value={goal}
                      onChange={(e) => updateGoal(i, e.target.value)}
                      placeholder={`Goal ${i + 1}`}
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (i === lifeGoals.length - 1) addGoal();
                        }
                      }}
                    />
                    {lifeGoals.length > 1 && (
                      <button
                        onClick={() => removeGoal(i)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {lifeGoals.length < 5 && (
                <button
                  onClick={addGoal}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add another goal
                </button>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Your main focus for {new Date().getFullYear()}
              </label>
              <input
                autoFocus
                type="text"
                value={yearlyGoal}
                onChange={(e) => setYearlyGoal(e.target.value)}
                placeholder="e.g. Launch my first product, get healthier, build deeper relationships"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-muted-foreground"
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Your timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                We auto-detected <strong>{timezone.replace(/_/g, " ")}</strong> — change it if needed.
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-0 disabled:pointer-events-none"
          >
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!canAdvance() || submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Get Started
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
