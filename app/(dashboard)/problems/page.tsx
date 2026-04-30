"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Sparkles,
  AlertOctagon,
  RotateCcw,
  BrainCircuit,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Problem = {
  title: string;
  firstSeen: string;
  lastSeen: string;
  solutions: string[];
  occurrences: number;
  solvedManually: boolean | null;
  aiResolved: boolean | null;
  aiEvidence: string | null;
  resolvedAt: number | null;
};

function isSolved(p: Problem) {
  return p.solvedManually === true || (p.solvedManually === null && p.aiResolved === true);
}

function statusLabel(p: Problem) {
  if (p.solvedManually === true) return "Resolved";
  if (p.solvedManually === false) return "Open";
  if (p.aiResolved === true) return "AI: likely resolved";
  if (p.aiResolved === false) return "AI: still open";
  return "Unknown";
}

function statusColor(p: Problem) {
  if (p.solvedManually === true) return "text-green-600 dark:text-green-400";
  if (p.solvedManually === false) return "text-red-500 dark:text-red-400";
  if (p.aiResolved === true) return "text-emerald-500 dark:text-emerald-400";
  if (p.aiResolved === false) return "text-amber-500 dark:text-amber-400";
  return "text-muted-foreground";
}

function ProblemCard({
  problem,
  onToggle,
}: {
  problem: Problem;
  onToggle: (title: string, solved: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const solved = isSolved(problem);

  return (
    <Card className={cn("transition-opacity", solved && "opacity-60")}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => onToggle(problem.title, !solved)}
            className={cn(
              "mt-0.5 shrink-0 transition-colors",
              solved
                ? "text-green-500 hover:text-muted-foreground"
                : "text-muted-foreground/40 hover:text-green-500"
            )}
            title={solved ? "Mark as open" : "Mark as resolved"}
          >
            {solved ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <CardTitle
              className={cn(
                "text-sm font-semibold leading-snug",
                solved && "line-through text-muted-foreground"
              )}
            >
              {problem.title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
              {solved && problem.resolvedAt ? (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Resolved {format(new Date(problem.resolvedAt), "MMM d, yyyy")}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  First seen {format(parseISO(problem.firstSeen), "MMM d, yyyy")}
                </span>
              )}
              {problem.occurrences > 1 && (
                <span className="text-xs text-muted-foreground">
                  · {problem.occurrences}× recurring
                </span>
              )}
              {!solved && (
                <span className={cn("text-xs font-medium", statusColor(problem))}>
                  · {statusLabel(problem)}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      {(problem.solutions.length > 0 || problem.aiEvidence) && (
        <CardContent className="px-4 pb-4 pt-0 pl-12">
          {problem.solutions.length > 0 && (
            <div className="mt-1">
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {expanded ? "Hide" : "Show"} proposed solutions
              </button>
              {expanded && (
                <div className="mt-2 space-y-1.5">
                  {problem.solutions.map((s, i) => (
                    <p key={i} className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                      {s}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {problem.aiEvidence && (
            <div className="mt-2 flex gap-2 rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
              <BrainCircuit className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {problem.aiEvidence}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function ProblemsPage() {
  const { convexUserId, isLoading } = useConvexUser();
  const [analyzing, setAnalyzing] = useState(false);
  const [resolvedOpen, setResolvedOpen] = useState(false);

  const problems = useQuery(
    api.problems.getAllProblems,
    convexUserId ? { userId: convexUserId } : "skip"
  ) as Problem[] | undefined;

  const setProblemStatus = useMutation(api.problems.setProblemStatus);
  const analyzeProblemResolution = useAction(api.ai.analyzeProblemResolution);

  async function handleToggle(title: string, solved: boolean) {
    if (!convexUserId) return;
    try {
      await setProblemStatus({ userId: convexUserId, problemTitle: title, solvedManually: solved });
    } catch {
      toast.error("Failed to update problem status.");
    }
  }

  async function handleAnalyze() {
    if (!convexUserId) return;
    setAnalyzing(true);
    try {
      const result = await analyzeProblemResolution({ userId: convexUserId });
      if (result.analyzed > 0) {
        toast.success(`AI analyzed ${result.analyzed} problem${result.analyzed === 1 ? "" : "s"}.`);
      } else {
        toast.info("No problems or reports found to analyze.");
      }
    } catch {
      toast.error("AI analysis failed. Make sure your reports are submitted.");
    } finally {
      setAnalyzing(false);
    }
  }

  const { openProblems, resolvedProblems } = useMemo(() => {
    if (!problems) return { openProblems: [], resolvedProblems: [] };
    return {
      openProblems: problems.filter((p) => !isSolved(p)),
      resolvedProblems: problems
        .filter((p) => isSolved(p))
        .sort((a, b) => (b.resolvedAt ?? 0) - (a.resolvedAt ?? 0)),
    };
  }, [problems]);

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">Problems</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All problems you&apos;ve logged across your daily reports, tracked in one place.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleAnalyze}
          disabled={analyzing || !problems || problems.length === 0}
          className="shrink-0"
        >
          <BrainCircuit className="w-4 h-4 mr-1.5" />
          {analyzing ? "Analyzing…" : "AI Analysis"}
        </Button>
      </div>

      {/* Stats strip */}
      {problems && problems.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {([
            { label: "Total", count: problems.length, color: "text-foreground" },
            { label: "Open", count: openProblems.length, color: "text-amber-500" },
            { label: "Resolved", count: resolvedProblems.length, color: "text-emerald-500" },
          ]).map(({ label, count, color }) => (
            <div key={label} className="rounded-xl border border-border p-3 text-center">
              <div className={cn("text-2xl font-bold", color)}>{count}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Problem list */}
      {problems === undefined ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : problems.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <AlertOctagon className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold">No problems logged yet</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Problems you log in your daily reports will appear here so you can track them over time.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Open problems */}
          {openProblems.length > 0 && (
            <div className="space-y-3">
              {openProblems.map((problem) => (
                <ProblemCard key={problem.title} problem={problem} onToggle={handleToggle} />
              ))}
            </div>
          )}

          {openProblems.length === 0 && resolvedProblems.length > 0 && (
            <div className="text-center py-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">All problems resolved!</p>
            </div>
          )}

          {/* Resolved section (collapsible) */}
          {resolvedProblems.length > 0 && (
            <div>
              <button
                onClick={() => setResolvedOpen((v) => !v)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 w-full"
              >
                <ChevronRight className={cn("w-4 h-4 transition-transform", resolvedOpen && "rotate-90")} />
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="font-medium">Resolved</span>
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{resolvedProblems.length}</span>
                <RotateCcw className="w-3.5 h-3.5 ml-auto opacity-50" />
                <span className="text-xs opacity-50">click any to reopen</span>
              </button>

              {resolvedOpen && (
                <div className="space-y-3 mt-2">
                  {resolvedProblems.map((problem) => (
                    <ProblemCard key={problem.title} problem={problem} onToggle={handleToggle} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI info banner */}
      {problems && problems.length > 0 && !problems.some((p) => p.aiEvidence) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Hit <strong className="text-foreground">AI Analysis</strong> to cross-reference your problems against your
              daily reports — Claude will check what you said you solved and what you planned, and surface which
              problems are likely still open.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
