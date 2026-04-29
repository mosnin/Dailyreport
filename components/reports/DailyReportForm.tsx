"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { todayString } from "@/lib/utils";
import { Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

// ── Types ──────────────────────────────────────────────────────────────────

type PersonMet = {
  id: string;
  name: string;
  goalRelated: boolean | null;
  notes: string;
};

type Problem = {
  id: string;
  title: string;
  solutions: string;
};

export type DailyReportResponses = {
  dayActivity: string;
  peopleMetToday: PersonMet[];
  dailyGoals: string[];
  emotionalDrain: string;
  problemsToSolve: Problem[];
  problemsSolvedToday: string[];
  didAffirmations: boolean | null;
  tomorrowPlan: string;
};

function makeId() {
  return Math.random().toString(36).slice(2);
}

function defaultResponses(): DailyReportResponses {
  return {
    dayActivity: "",
    peopleMetToday: [],
    dailyGoals: [],
    emotionalDrain: "",
    problemsToSolve: [],
    problemsSolvedToday: [],
    didAffirmations: null,
    tomorrowPlan: "",
  };
}

function hydrateResponses(raw: Record<string, unknown>): DailyReportResponses {
  const d = defaultResponses();
  if (typeof raw.dayActivity === "string") d.dayActivity = raw.dayActivity;
  if (Array.isArray(raw.peopleMetToday)) d.peopleMetToday = raw.peopleMetToday as PersonMet[];
  if (Array.isArray(raw.dailyGoals)) d.dailyGoals = raw.dailyGoals as string[];
  if (typeof raw.emotionalDrain === "string") d.emotionalDrain = raw.emotionalDrain;
  if (Array.isArray(raw.problemsToSolve)) d.problemsToSolve = raw.problemsToSolve as Problem[];
  if (Array.isArray(raw.problemsSolvedToday)) d.problemsSolvedToday = raw.problemsSolvedToday as string[];
  if (typeof raw.didAffirmations === "boolean" || raw.didAffirmations === null)
    d.didAffirmations = raw.didAffirmations as boolean | null;
  if (typeof raw.tomorrowPlan === "string") d.tomorrowPlan = raw.tomorrowPlan;
  return d;
}

function wordCount(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

// ── Journal section header ─────────────────────────────────────────────────

function JournalSection({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="space-y-5 py-9 border-t border-border/30 first:border-t-0 first:pt-0"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: number * 0.055 }}
    >
      <div>
        <span className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/35 uppercase">
          {String(number).padStart(2, "0")}
        </span>
        <p className="font-heading text-[1.15rem] font-medium leading-snug text-foreground mt-1.5">
          {title}
        </p>
      </div>
      {children}
    </motion.div>
  );
}

// ── Notebook textarea ──────────────────────────────────────────────────────

function NoteTextarea({
  value,
  onChange,
  placeholder,
  minHeight = 120,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  minHeight?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ minHeight }}
      className="w-full bg-transparent border-0 border-b border-border/35 focus:border-primary/50 focus:outline-none resize-none text-[15px] leading-[1.9] text-foreground placeholder:text-muted-foreground/30 pb-2 transition-colors duration-200"
    />
  );
}

// ── Main form ──────────────────────────────────────────────────────────────

const DRAFT_KEY_PREFIX = "dailyreport-draft-";

export function DailyReportForm({
  userId,
  initialResponses,
  onSuccess,
}: {
  userId: Id<"users">;
  initialResponses?: Record<string, unknown>;
  onSuccess?: () => void;
}) {
  const draftKey = `${DRAFT_KEY_PREFIX}${todayString()}`;
  const isFreshForm = !initialResponses;

  const [r, setR] = useState<DailyReportResponses>(() => {
    if (initialResponses) return hydrateResponses(initialResponses);
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) return hydrateResponses(JSON.parse(saved));
    } catch {}
    return defaultResponses();
  });

  const [saving, setSaving] = useState(false);
  const submitDaily = useMutation(api.reports.submitDaily);

  useEffect(() => {
    if (!isFreshForm) return;
    try { localStorage.setItem(draftKey, JSON.stringify(r)); } catch {}
  }, [r, isFreshForm, draftKey]);

  function set<K extends keyof DailyReportResponses>(key: K, value: DailyReportResponses[K]) {
    setR((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!r.dayActivity.trim()) {
      toast.error("Write something for question 1 before closing.");
      return;
    }
    if (!r.tomorrowPlan.trim()) {
      toast.error("Write tomorrow's plan before closing.");
      return;
    }
    setSaving(true);
    try {
      await submitDaily({ userId, date: todayString(), responses: r });
      try { localStorage.removeItem(draftKey); } catch {}
      confetti({ particleCount: 80, spread: 55, origin: { y: 0.7 }, colors: ["#6366f1", "#a5b4fc", "#e0e7ff"] });
      onSuccess?.();
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Field helpers ─────────────────────────────────────────────────────────

  function addPerson() {
    set("peopleMetToday", [...r.peopleMetToday, { id: makeId(), name: "", goalRelated: null, notes: "" }]);
  }
  function updatePerson(id: string, patch: Partial<PersonMet>) {
    set("peopleMetToday", r.peopleMetToday.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function removePerson(id: string) {
    set("peopleMetToday", r.peopleMetToday.filter((p) => p.id !== id));
  }
  function addGoal() { set("dailyGoals", [...r.dailyGoals, ""]); }
  function updateGoal(i: number, val: string) {
    set("dailyGoals", r.dailyGoals.map((g, idx) => (idx === i ? val : g)));
  }
  function removeGoal(i: number) { set("dailyGoals", r.dailyGoals.filter((_, idx) => idx !== i)); }
  function addProblem() {
    set("problemsToSolve", [...r.problemsToSolve, { id: makeId(), title: "", solutions: "" }]);
  }
  function updateProblem(id: string, patch: Partial<Problem>) {
    set("problemsToSolve", r.problemsToSolve.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function removeProblem(id: string) { set("problemsToSolve", r.problemsToSolve.filter((p) => p.id !== id)); }
  function addSolvedProblem() { set("problemsSolvedToday", [...r.problemsSolvedToday, ""]); }
  function updateSolvedProblem(i: number, val: string) {
    set("problemsSolvedToday", r.problemsSolvedToday.map((p, idx) => (idx === i ? val : p)));
  }
  function removeSolvedProblem(i: number) {
    set("problemsSolvedToday", r.problemsSolvedToday.filter((_, idx) => idx !== i));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-0">

      {/* Q1 */}
      <JournalSection number={1} title="What did you do today and how did you spend your time?">
        <div>
          <NoteTextarea
            value={r.dayActivity}
            onChange={(v) => set("dayActivity", v)}
            placeholder="Walk through your day…"
          />
          {wordCount(r.dayActivity) > 0 && (
            <p className="text-[11px] text-muted-foreground/40 mt-1.5 text-right tabular-nums">
              {wordCount(r.dayActivity)} words
            </p>
          )}
        </div>
      </JournalSection>

      {/* Q2 */}
      <JournalSection number={2} title="Who did you meet or talk to today, and did they relate to your goals?">
        <div className="space-y-6">
          {/* People */}
          <div className="space-y-3">
            {r.peopleMetToday.length > 0 && (
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                People
              </p>
            )}
            {r.peopleMetToday.map((person) => (
              <div key={person.id} className="space-y-2 pb-3 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  <input
                    value={person.name}
                    onChange={(e) => updatePerson(person.id, { name: e.target.value })}
                    placeholder="Name"
                    className="flex-1 text-sm bg-transparent border-0 border-b border-border/40 focus:border-foreground/50 focus:outline-none pb-1 transition-colors"
                  />
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => updatePerson(person.id, { goalRelated: true })}
                      className={cn("text-[11px] px-2 py-0.5 rounded-full border transition-colors",
                        person.goalRelated === true ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "border-border/50 text-muted-foreground/50 hover:border-emerald-400/50"
                      )}>goal</button>
                    <button type="button" onClick={() => removePerson(person.id)}
                      className="text-muted-foreground/30 hover:text-muted-foreground transition-colors p-0.5">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                {person.notes !== undefined && (
                  <input
                    value={person.notes}
                    onChange={(e) => updatePerson(person.id, { notes: e.target.value })}
                    placeholder="Notes (optional)"
                    className="w-full text-xs bg-transparent border-0 border-b border-border/30 focus:border-foreground/40 focus:outline-none pb-1 text-muted-foreground placeholder:text-muted-foreground/30 transition-colors"
                  />
                )}
              </div>
            ))}
            <button type="button" onClick={addPerson}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
              <Plus className="w-3.5 h-3.5" />
              Add person
            </button>
          </div>

          {/* Goals for context */}
          {(r.dailyGoals.length > 0 || true) && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                Your goals (for reference)
              </p>
              {r.dailyGoals.map((goal, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground/30 text-xs tabular-nums shrink-0">{i + 1}.</span>
                  <input
                    value={goal}
                    onChange={(e) => updateGoal(i, e.target.value)}
                    placeholder={`Goal ${i + 1}`}
                    className="flex-1 text-sm bg-transparent border-0 border-b border-border/40 focus:border-foreground/50 focus:outline-none pb-1 transition-colors"
                  />
                  <button type="button" onClick={() => removeGoal(i)}
                    className="text-muted-foreground/30 hover:text-muted-foreground transition-colors p-0.5 shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={addGoal}
                className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Add goal
              </button>
            </div>
          )}
        </div>
      </JournalSection>

      {/* Q3 */}
      <JournalSection number={3} title="Emotional bank account — how drained did you feel today?">
        <NoteTextarea
          value={r.emotionalDrain}
          onChange={(v) => set("emotionalDrain", v)}
          placeholder="What drained you, what energised you, how do you feel…"
          minHeight={100}
        />
      </JournalSection>

      {/* Q4 */}
      <JournalSection number={4} title="What problems need to be solved, and how might you solve them?">
        <div className="space-y-4">
          {r.problemsToSolve.map((problem, i) => (
            <div key={problem.id} className="space-y-2 pb-4 border-b border-border/30 last:border-0">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground/30 text-xs tabular-nums shrink-0">{i + 1}.</span>
                <input
                  value={problem.title}
                  onChange={(e) => updateProblem(problem.id, { title: e.target.value })}
                  placeholder="Problem"
                  className="flex-1 text-sm font-medium bg-transparent border-0 border-b border-border/40 focus:border-foreground/50 focus:outline-none pb-1 transition-colors"
                />
                <button type="button" onClick={() => removeProblem(problem.id)}
                  className="text-muted-foreground/30 hover:text-muted-foreground transition-colors p-0.5 shrink-0">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <NoteTextarea
                value={problem.solutions}
                onChange={(v) => updateProblem(problem.id, { solutions: v })}
                placeholder="How might you solve this…"
                minHeight={72}
              />
            </div>
          ))}
          <button type="button" onClick={addProblem}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            <Plus className="w-3.5 h-3.5" />
            Add problem
          </button>
        </div>
      </JournalSection>

      {/* Q5 */}
      <JournalSection number={5} title="What problems did you solve today that stand between you and your goal?">
        <div className="space-y-2">
          {r.problemsSolvedToday.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500/60 shrink-0" />
              <input
                value={item}
                onChange={(e) => updateSolvedProblem(i, e.target.value)}
                placeholder={`Problem solved`}
                className="flex-1 text-sm bg-transparent border-0 border-b border-border/40 focus:border-foreground/50 focus:outline-none pb-1 transition-colors"
              />
              <button type="button" onClick={() => removeSolvedProblem(i)}
                className="text-muted-foreground/30 hover:text-muted-foreground transition-colors p-0.5 shrink-0">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button type="button" onClick={addSolvedProblem}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors mt-1">
            <Plus className="w-3.5 h-3.5" />
            Add solved problem
          </button>
        </div>
      </JournalSection>

      {/* Q6 */}
      <JournalSection number={6} title="Did you do your affirmations and visualize?">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => set("didAffirmations", true)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border text-sm font-medium transition-all",
              r.didAffirmations === true
                ? "border-emerald-500/50 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400"
                : "border-border/50 text-muted-foreground/60 hover:border-emerald-400/40 hover:text-emerald-600"
            )}
          >
            <CheckCircle className="w-4 h-4" />
            Yes
          </button>
          <button
            type="button"
            onClick={() => set("didAffirmations", false)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border text-sm font-medium transition-all",
              r.didAffirmations === false
                ? "border-rose-500/50 bg-rose-500/8 text-rose-600 dark:text-rose-400"
                : "border-border/50 text-muted-foreground/60 hover:border-rose-400/40 hover:text-rose-500"
            )}
          >
            <XCircle className="w-4 h-4" />
            No
          </button>
        </div>
      </JournalSection>

      {/* Q7 */}
      <JournalSection number={7} title="What do you plan on doing tomorrow? Problems / challenges?">
        <div>
          <NoteTextarea
            value={r.tomorrowPlan}
            onChange={(v) => set("tomorrowPlan", v)}
            placeholder="Tomorrow's plan, anticipated problems and challenges…"
          />
          {wordCount(r.tomorrowPlan) > 0 && (
            <p className="text-[11px] text-muted-foreground/40 mt-1.5 text-right tabular-nums">
              {wordCount(r.tomorrowPlan)} words
            </p>
          )}
        </div>
      </JournalSection>

      {/* Submit */}
      <motion.div
        className="pt-10 pb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <motion.button
          type="submit"
          disabled={saving}
          whileTap={{ scale: 0.98 }}
          className="w-full py-4 rounded-2xl bg-foreground text-background font-heading text-[15px] font-medium hover:bg-foreground/90 transition-colors disabled:opacity-40"
        >
          {saving ? "Saving…" : "Close today's entry"}
        </motion.button>
      </motion.div>
    </form>
  );
}
