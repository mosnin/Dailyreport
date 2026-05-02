"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { currentWeekStartString } from "@/lib/utils";
import { Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

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

export type WeeklyReportResponses = {
  weekActivity: string;
  peopleMetThisWeek: PersonMet[];
  weeklyGoals: string[];
  emotionalDrain: string;
  problemsToSolve: Problem[];
  problemsSolvedThisWeek: string[];
  didAffirmations: boolean | null;
  nextWeekPlan: string;
};

function makeId() {
  return Math.random().toString(36).slice(2);
}

function defaultResponses(): WeeklyReportResponses {
  return {
    weekActivity: "",
    peopleMetThisWeek: [],
    weeklyGoals: [],
    emotionalDrain: "",
    problemsToSolve: [],
    problemsSolvedThisWeek: [],
    didAffirmations: null,
    nextWeekPlan: "",
  };
}

function hydrateResponses(raw: Record<string, unknown>): WeeklyReportResponses {
  const d = defaultResponses();
  if (typeof raw.weekActivity === "string") d.weekActivity = raw.weekActivity;
  if (Array.isArray(raw.peopleMetThisWeek)) d.peopleMetThisWeek = raw.peopleMetThisWeek as PersonMet[];
  if (Array.isArray(raw.weeklyGoals)) d.weeklyGoals = raw.weeklyGoals as string[];
  if (typeof raw.emotionalDrain === "string") d.emotionalDrain = raw.emotionalDrain;
  if (Array.isArray(raw.problemsToSolve)) d.problemsToSolve = raw.problemsToSolve as Problem[];
  if (Array.isArray(raw.problemsSolvedThisWeek)) d.problemsSolvedThisWeek = raw.problemsSolvedThisWeek as string[];
  if (typeof raw.didAffirmations === "boolean" || raw.didAffirmations === null)
    d.didAffirmations = raw.didAffirmations as boolean | null;
  if (typeof raw.nextWeekPlan === "string") d.nextWeekPlan = raw.nextWeekPlan;
  return d;
}

function wordCount(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

// ── Journal section header ─────────────────────────────────────────────────

function JournalSection({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
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

function NoteTextarea({ value, onChange, placeholder, minHeight = 120 }: {
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

const DRAFT_KEY_PREFIX = "weeklyreport-draft-";

export function WeeklyReportForm({
  userId,
  initialResponses,
  draftBullets,
}: {
  userId: Id<"users">;
  initialResponses?: Record<string, unknown>;
  draftBullets?: string[];
}) {
  const weekStart = currentWeekStartString();
  const draftKey = `${DRAFT_KEY_PREFIX}${weekStart}`;
  const isFreshForm = !initialResponses;

  const [r, setR] = useState<WeeklyReportResponses>(() => {
    if (initialResponses) return hydrateResponses(initialResponses);
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) return hydrateResponses(JSON.parse(saved));
    } catch {}
    return defaultResponses();
  });

  const [saving, setSaving] = useState(false);
  const submitWeekly = useMutation(api.reports.submitWeekly);

  // Autosave draft to localStorage on every change (fresh forms only)
  useEffect(() => {
    if (!isFreshForm) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(r));
    } catch {}
  }, [r, isFreshForm, draftKey]);

  // Append newly clicked draft bullets into Q1 (weekActivity)
  const [prevBulletsLen, setPrevBulletsLen] = useState(0);
  useEffect(() => {
    if (!draftBullets || draftBullets.length === 0) return;
    if (draftBullets.length > prevBulletsLen) {
      const newBullet = draftBullets[draftBullets.length - 1];
      setPrevBulletsLen(draftBullets.length);
      setR((prev) => ({
        ...prev,
        weekActivity: prev.weekActivity
          ? `${prev.weekActivity}\n• ${newBullet}`
          : `• ${newBullet}`,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftBullets]);

  function set<K extends keyof WeeklyReportResponses>(key: K, value: WeeklyReportResponses[K]) {
    setR((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!r.weekActivity.trim()) {
      toast.error("Q1 is required — describe how you spent your week.");
      return;
    }
    if (!r.nextWeekPlan.trim()) {
      toast.error("Q8 is required — write your plan for next week.");
      return;
    }
    setSaving(true);
    try {
      await submitWeekly({ userId, weekStartDate: weekStart, responses: r });
      try { localStorage.removeItem(draftKey); } catch {}
      toast.success("Weekly review saved.");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Q2 helpers ────────────────────────────────────────────────────────────

  function addPerson() {
    set("peopleMetThisWeek", [
      ...r.peopleMetThisWeek,
      { id: makeId(), name: "", goalRelated: null, notes: "" },
    ]);
  }

  function updatePerson(id: string, patch: Partial<PersonMet>) {
    set(
      "peopleMetThisWeek",
      r.peopleMetThisWeek.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  }

  function removePerson(id: string) {
    set("peopleMetThisWeek", r.peopleMetThisWeek.filter((p) => p.id !== id));
  }

  function addGoal() {
    set("weeklyGoals", [...r.weeklyGoals, ""]);
  }

  function updateGoal(i: number, val: string) {
    set("weeklyGoals", r.weeklyGoals.map((g, idx) => (idx === i ? val : g)));
  }

  function removeGoal(i: number) {
    set("weeklyGoals", r.weeklyGoals.filter((_, idx) => idx !== i));
  }

  // ── Q5 helpers ────────────────────────────────────────────────────────────

  function addProblem() {
    set("problemsToSolve", [
      ...r.problemsToSolve,
      { id: makeId(), title: "", solutions: "" },
    ]);
  }

  function updateProblem(id: string, patch: Partial<Problem>) {
    set(
      "problemsToSolve",
      r.problemsToSolve.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  }

  function removeProblem(id: string) {
    set("problemsToSolve", r.problemsToSolve.filter((p) => p.id !== id));
  }

  // ── Q6 helpers ────────────────────────────────────────────────────────────

  function addSolvedProblem() {
    set("problemsSolvedThisWeek", [...r.problemsSolvedThisWeek, ""]);
  }

  function updateSolvedProblem(i: number, val: string) {
    set(
      "problemsSolvedThisWeek",
      r.problemsSolvedThisWeek.map((p, idx) => (idx === i ? val : p))
    );
  }

  function removeSolvedProblem(i: number) {
    set("problemsSolvedThisWeek", r.problemsSolvedThisWeek.filter((_, idx) => idx !== i));
  }

  // ── Progress ───────────────────────────────────────────────────────────────

  const filledCount = [
    r.weekActivity.trim().length > 0,
    r.weeklyGoals.length > 0,
    r.emotionalDrain.trim().length > 0,
    r.didAffirmations !== null,
    r.nextWeekPlan.trim().length > 0,
  ].filter(Boolean).length;

  const pct = (filledCount / 5) * 100;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      <form onSubmit={handleSubmit} className="space-y-0">

        {/* Progress bar */}
        <div className="mb-8 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-[0.16em] uppercase text-muted-foreground/40">
              {filledCount === 5 ? "Ready to close" : `${filledCount} of 5`}
            </span>
            {filledCount === 5 && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-[11px] font-medium text-emerald-500"
              >
                Complete ✓
              </motion.span>
            )}
          </div>
          <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>

        {/* Q1 — This week in brief */}
        <JournalSection number={1} title="This week in brief">
          <div>
            <NoteTextarea
              value={r.weekActivity}
              onChange={(v) => set("weekActivity", v)}
              placeholder="What defined this week? What did you actually spend your time on?"
            />
            {wordCount(r.weekActivity) > 0 && (
              <p className="text-[11px] text-muted-foreground/40 mt-1.5 text-right tabular-nums">
                {wordCount(r.weekActivity)} words
              </p>
            )}
          </div>
        </JournalSection>

        {/* Q2 — Who you connected with */}
        <JournalSection number={2} title="Who you connected with">
          <div className="space-y-6">
            {/* People */}
            <div className="space-y-3">
              {r.peopleMetThisWeek.length > 0 && (
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  People
                </p>
              )}
              {r.peopleMetThisWeek.map((person) => (
                <div key={person.id} className="space-y-2 pb-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={person.name}
                      onChange={(e) => updatePerson(person.id, { name: e.target.value })}
                      placeholder="Name"
                      className="flex-1 text-sm bg-transparent border-0 border-b border-border/40 focus:border-foreground/50 focus:outline-none pb-1 transition-colors"
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => updatePerson(person.id, { goalRelated: true })}
                        className={cn(
                          "text-[11px] px-2 py-0.5 rounded-full border transition-colors",
                          person.goalRelated === true
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            : "border-border/50 text-muted-foreground/50 hover:border-emerald-400/50"
                        )}
                      >
                        goal
                      </button>
                      <button
                        type="button"
                        onClick={() => removePerson(person.id)}
                        className="text-muted-foreground/30 hover:text-muted-foreground transition-colors p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <input
                    value={person.notes}
                    onChange={(e) => updatePerson(person.id, { notes: e.target.value })}
                    placeholder="Notes (optional)"
                    className="w-full text-xs bg-transparent border-0 border-b border-border/30 focus:border-foreground/40 focus:outline-none pb-1 text-muted-foreground placeholder:text-muted-foreground/30 transition-colors"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addPerson}
                className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add person
              </button>
            </div>

            {/* Alignment summary */}
            {r.peopleMetThisWeek.length > 0 && (
              <div className="pt-1">
                <p className="text-[11px] text-muted-foreground/40 tabular-nums">
                  {r.peopleMetThisWeek.filter((p) => p.goalRelated).length} of {r.peopleMetThisWeek.length} goal-aligned
                </p>
              </div>
            )}
          </div>
        </JournalSection>

        {/* Q3 — What you set out to accomplish */}
        <JournalSection number={3} title="What you set out to accomplish">
          <div className="space-y-2">
            {r.weeklyGoals.map((goal, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-muted-foreground/30 text-xs tabular-nums shrink-0">{i + 1}.</span>
                <input
                  value={goal}
                  onChange={(e) => updateGoal(i, e.target.value)}
                  placeholder={`Goal ${i + 1}`}
                  className="flex-1 text-sm bg-transparent border-0 border-b border-border/40 focus:border-foreground/50 focus:outline-none pb-1 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => removeGoal(i)}
                  className="text-muted-foreground/30 hover:text-muted-foreground transition-colors p-0.5 shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addGoal}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add goal
            </button>
          </div>
        </JournalSection>

        {/* Q4 — What drained you */}
        <JournalSection number={4} title="What drained you">
          <NoteTextarea
            value={r.emotionalDrain}
            onChange={(v) => set("emotionalDrain", v)}
            placeholder="What cost you more energy than it gave back this week?"
            minHeight={100}
          />
        </JournalSection>

        {/* Q5 — Problems you're still carrying */}
        <JournalSection number={5} title="Problems you're still carrying">
          <div className="space-y-4">
            {r.problemsToSolve.map((problem, i) => (
              <div key={problem.id} className="space-y-2 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground/30 text-xs tabular-nums shrink-0">{i + 1}.</span>
                  <input
                    value={problem.title}
                    onChange={(e) => updateProblem(problem.id, { title: e.target.value })}
                    placeholder="Problem"
                    className="flex-1 text-sm font-medium bg-transparent border-0 border-b border-border/40 focus:border-foreground/50 focus:outline-none pb-1 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => removeProblem(problem.id)}
                    className="text-muted-foreground/30 hover:text-muted-foreground transition-colors p-0.5 shrink-0"
                  >
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
            <button
              type="button"
              onClick={addProblem}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add problem
            </button>
          </div>
        </JournalSection>

        {/* Q6 — What you resolved */}
        <JournalSection number={6} title="What you resolved">
          <div className="space-y-2">
            {r.problemsSolvedThisWeek.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500/60 shrink-0" />
                <input
                  value={item}
                  onChange={(e) => updateSolvedProblem(i, e.target.value)}
                  placeholder="Problem solved"
                  className="flex-1 text-sm bg-transparent border-0 border-b border-border/40 focus:border-foreground/50 focus:outline-none pb-1 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => removeSolvedProblem(i)}
                  className="text-muted-foreground/30 hover:text-muted-foreground transition-colors p-0.5 shrink-0"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addSolvedProblem}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors mt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add solved problem
            </button>
          </div>
        </JournalSection>

        {/* Q7 — Your practice this week */}
        <JournalSection number={7} title="Your practice this week">
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

        {/* Q8 — Into next week */}
        <JournalSection number={8} title="Into next week">
          <div>
            <NoteTextarea
              value={r.nextWeekPlan}
              onChange={(v) => set("nextWeekPlan", v)}
              placeholder="What does next week need to look like? What's the one thing that matters most?"
            />
            {wordCount(r.nextWeekPlan) > 0 && (
              <p className="text-[11px] text-muted-foreground/40 mt-1.5 text-right tabular-nums">
                {wordCount(r.nextWeekPlan)} words
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
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-2xl bg-foreground text-background font-heading text-[15px] font-medium hover:bg-foreground/90 transition-colors disabled:opacity-40"
          >
            {saving ? "Saving…" : initialResponses ? "Update review" : "Close this week"}
          </motion.button>
        </motion.div>
      </form>
    </AnimatePresence>
  );
}
