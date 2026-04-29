"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { currentWeekStartString } from "@/lib/utils";
import { Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

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

// ── Sub-components ─────────────────────────────────────────────────────────

function QuestionCard({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold shrink-0">
            {number}
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ── Main form ──────────────────────────────────────────────────────────────

const DRAFT_KEY_PREFIX = "weeklyreport-draft-";

export function WeeklyReportForm({
  userId,
  initialResponses,
}: {
  userId: Id<"users">;
  initialResponses?: Record<string, unknown>;
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
      toast.error("Q7 is required — write your plan for next week.");
      return;
    }
    setSaving(true);
    try {
      await submitWeekly({ userId, weekStartDate: weekStart, responses: r });
      try { localStorage.removeItem(draftKey); } catch {}
      toast.success("Weekly report submitted!");
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

  // ── Q4 helpers ────────────────────────────────────────────────────────────

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

  // ── Q5 helpers ────────────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Q1 */}
      <QuestionCard number={1} title="What did you do this week and how did you spend your time?">
        <div>
          <Textarea
            value={r.weekActivity}
            onChange={(e) => set("weekActivity", e.target.value)}
            placeholder="Walk through your week..."
            className="min-h-[120px] resize-none"
          />
          <p className="text-xs text-muted-foreground/60 mt-1 text-right">
            {wordCount(r.weekActivity)} {wordCount(r.weekActivity) === 1 ? "word" : "words"}
          </p>
        </div>
      </QuestionCard>

      {/* Q2 */}
      <QuestionCard number={2} title="Who did you meet or talk to this week, and did they relate to your goals?">
        <div className="grid md:grid-cols-2 gap-6">
          {/* People column */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              People you met this week
            </p>
            {r.peopleMetThisWeek.map((person) => (
              <div key={person.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={person.name}
                    onChange={(e) => updatePerson(person.id, { name: e.target.value })}
                    placeholder="Person's name"
                    className="flex-1 text-sm bg-transparent border-b border-border focus:border-primary focus:outline-none pb-1"
                  />
                  <button
                    type="button"
                    onClick={() => removePerson(person.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Goal-related?</span>
                  <button
                    type="button"
                    onClick={() => updatePerson(person.id, { goalRelated: true })}
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border transition-colors",
                      person.goalRelated === true
                        ? "bg-green-500/20 border-green-500/40 text-green-600 dark:text-green-400"
                        : "border-border text-muted-foreground hover:border-green-400"
                    )}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => updatePerson(person.id, { goalRelated: false })}
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full border transition-colors",
                      person.goalRelated === false
                        ? "bg-red-500/20 border-red-500/40 text-red-500 dark:text-red-400"
                        : "border-border text-muted-foreground hover:border-red-400"
                    )}
                  >
                    No
                  </button>
                </div>
                <input
                  value={person.notes}
                  onChange={(e) => updatePerson(person.id, { notes: e.target.value })}
                  placeholder="Notes (optional)"
                  className="w-full text-xs bg-transparent border-b border-border focus:border-primary focus:outline-none pb-1 text-muted-foreground"
                />
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addPerson} className="w-full">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add person
            </Button>
          </div>

          {/* Goals column */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Your goals (for comparison)
            </p>
            {r.weeklyGoals.map((goal, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground shrink-0">{i + 1}.</span>
                <input
                  value={goal}
                  onChange={(e) => updateGoal(i, e.target.value)}
                  placeholder={`Goal ${i + 1}`}
                  className="flex-1 text-sm bg-transparent border-b border-border focus:border-primary focus:outline-none pb-1"
                />
                <button
                  type="button"
                  onClick={() => removeGoal(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addGoal} className="w-full">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add goal
            </Button>

            {/* Alignment summary */}
            {r.peopleMetThisWeek.length > 0 && r.weeklyGoals.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">Goal-aligned meetings this week</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-green-600">
                    {r.peopleMetThisWeek.filter((p) => p.goalRelated).length}
                  </span>
                  <span className="text-xs text-muted-foreground">of</span>
                  <span className="text-sm font-semibold">{r.peopleMetThisWeek.length}</span>
                  <span className="text-xs text-muted-foreground">people met</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </QuestionCard>

      {/* Q3 */}
      <QuestionCard number={3} title="Emotional bank account — how drained did you feel this week?">
        <Textarea
          value={r.emotionalDrain}
          onChange={(e) => set("emotionalDrain", e.target.value)}
          placeholder="How did you feel emotionally across the week? What drained or energised you?"
          className="min-h-[100px] resize-none"
        />
      </QuestionCard>

      {/* Q4 */}
      <QuestionCard number={4} title="What problems need to be solved, and how might you solve them?">
        <div className="space-y-3">
          {r.problemsToSolve.map((problem, i) => (
            <div key={problem.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="shrink-0 text-xs">Problem {i + 1}</Badge>
                <input
                  value={problem.title}
                  onChange={(e) => updateProblem(problem.id, { title: e.target.value })}
                  placeholder="Problem title"
                  className="flex-1 text-sm font-medium bg-transparent focus:outline-none border-b border-border focus:border-primary pb-1"
                />
                <button
                  type="button"
                  onClick={() => removeProblem(problem.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <Textarea
                value={problem.solutions}
                onChange={(e) => updateProblem(problem.id, { solutions: e.target.value })}
                placeholder="Ways to solve this problem..."
                className="min-h-[80px] resize-none text-sm"
              />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addProblem} className="w-full">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add problem
          </Button>
        </div>
      </QuestionCard>

      {/* Q5 */}
      <QuestionCard number={5} title="What problems did you solve this week that stand between you and your goal?">
        <div className="space-y-2">
          {r.problemsSolvedThisWeek.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
              <input
                value={item}
                onChange={(e) => updateSolvedProblem(i, e.target.value)}
                placeholder={`Problem solved ${i + 1}`}
                className="flex-1 text-sm bg-transparent border-b border-border focus:border-primary focus:outline-none pb-1"
              />
              <button
                type="button"
                onClick={() => removeSolvedProblem(i)}
                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addSolvedProblem} className="w-full mt-1">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add solved problem
          </Button>
        </div>
      </QuestionCard>

      {/* Q6 */}
      <QuestionCard number={6} title="Did you do your affirmations and visualize this week?">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => set("didAffirmations", true)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
              r.didAffirmations === true
                ? "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400"
                : "border-border text-muted-foreground hover:border-green-400 hover:text-green-600"
            )}
          >
            <CheckCircle className="w-4 h-4" />
            Yes
          </button>
          <button
            type="button"
            onClick={() => set("didAffirmations", false)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 text-sm font-semibold transition-all",
              r.didAffirmations === false
                ? "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400"
                : "border-border text-muted-foreground hover:border-red-400 hover:text-red-500"
            )}
          >
            <XCircle className="w-4 h-4" />
            No
          </button>
        </div>
      </QuestionCard>

      {/* Q7 */}
      <QuestionCard number={7} title="What do you plan on doing next week? Problems / challenges?">
        <div>
          <Textarea
            value={r.nextWeekPlan}
            onChange={(e) => set("nextWeekPlan", e.target.value)}
            placeholder="Next week's plan, anticipated problems and challenges..."
            className="min-h-[120px] resize-none"
          />
          <p className="text-xs text-muted-foreground/60 mt-1 text-right">
            {wordCount(r.nextWeekPlan)} {wordCount(r.nextWeekPlan) === 1 ? "word" : "words"}
          </p>
        </div>
      </QuestionCard>

      <Separator />

      <Button type="submit" disabled={saving} className="w-full" size="lg">
        {saving ? "Saving..." : "Submit weekly report"}
      </Button>
    </form>
  );
}
