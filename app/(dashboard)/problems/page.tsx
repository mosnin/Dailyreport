"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  RotateCcw,
  TriangleAlert,
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
};

type Filter = "all" | "open" | "resolved";

function ProblemCard({
  problem,
  onToggle,
}: {
  problem: Problem;
  onToggle: (title: string, solved: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const isSolved =
    problem.solvedManually === true ||
    (problem.solvedManually === null && problem.aiResolved === true);

  const statusLabel = (() => {
    if (problem.solvedManually === true) return "Resolved";
    if (problem.solvedManually === false) return "Open";
    if (problem.aiResolved === true) return "AI: likely resolved";
    if (problem.aiResolved === false) return "AI: still open";
    return "Unknown";
  })();

  const statusColor = (() => {
    if (problem.solvedManually === true) return "text-green-600 dark:text-green-400";
    if (problem.solvedManually === false) return "text-red-500 dark:text-red-400";
    if (problem.aiResolved === true) return "text-emerald-500 dark:text-emerald-400";
    if (problem.aiResolved === false) return "text-amber-500 dark:text-amber-400";
    return "text-muted-foreground";
  })();

  return (
    <Card className={cn("transition-opacity", isSolved && "opacity-70")}>
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => onToggle(problem.title, !isSolved)}
            className={cn(
              "mt-0.5 shrink-0 transition-colors",
              isSolved
                ? "text-green-500 hover:text-muted-foreground"
                : "text-muted-foreground/40 hover:text-green-500"
            )}
            title={isSolved ? "Mark as open" : "Mark as resolved"}
          >
            {isSolved ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Circle className="w-5 h-5" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <CardTitle
              className={cn(
                "text-sm font-semibold leading-snug",
                isSolved && "line-through text-muted-foreground"
              )}
            >
              {problem.title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
              <span className="text-xs text-muted-foreground">
                First seen{" "}
                {format(parseISO(problem.firstSeen), "MMM d, yyyy")}
              </span>
              {problem.occurrences > 1 && (
                <span className="text-xs text-muted-foreground">
                  · {problem.occurrences}× recurring
                </span>
              )}
              <span className={cn("text-xs font-medium", statusColor)}>
                · {statusLabel}
              </span>
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
                {expanded ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
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
            <div className="mt-2 flex gap-2 rounded-md bg-indigo-500/5 border border-indigo-500/20 px-3 py-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
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
  const [filter, setFilter] = useState<Filter>("all");
  const [analyzing, setAnalyzing] = useState(false);

  const problems = useQuery(
    api.problems.getAllProblems,
    convexUserId ? { userId: convexUserId } : "skip"
  ) as Problem[] | undefined;

  const setProblemStatus = useMutation(api.problems.setProblemStatus);
  const analyzeProblemResolution = useAction(api.ai.analyzeProblemResolution);

  async function handleToggle(title: string, solved: boolean) {
    if (!convexUserId) return;
    try {
      await setProblemStatus({
        userId: convexUserId,
        problemTitle: title,
        solvedManually: solved,
      });
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

  const filtered = useMemo(() => {
    if (!problems) return [];
    return problems.filter((p) => {
      const isSolved =
        p.solvedManually === true ||
        (p.solvedManually === null && p.aiResolved === true);
      if (filter === "open") return !isSolved;
      if (filter === "resolved") return isSolved;
      return true;
    });
  }, [problems, filter]);

  const counts = useMemo(() => {
    if (!problems) return { all: 0, open: 0, resolved: 0 };
    const resolved = problems.filter(
      (p) =>
        p.solvedManually === true ||
        (p.solvedManually === null && p.aiResolved === true)
    ).length;
    return {
      all: problems.length,
      open: problems.length - resolved,
      resolved,
    };
  }, [problems]);

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-6 w-64" />
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
          <h1 className="text-2xl font-bold">Problems</h1>
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
          <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          {analyzing ? "Analyzing…" : "AI Analysis"}
        </Button>
      </div>

      {/* Stats */}
      {problems && problems.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {(["all", "open", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-xl border p-3 text-left transition-all",
                filter === f
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              <div className="text-xl font-bold">{counts[f]}</div>
              <div className="text-xs text-muted-foreground capitalize mt-0.5">{f}</div>
            </button>
          ))}
        </div>
      )}

      <Separator />

      {/* Problem list */}
      {problems === undefined ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : problems.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <TriangleAlert className="w-5 h-5 text-muted-foreground" />
            </div>
            <h2 className="text-base font-semibold">No problems logged yet</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Problems you log in your daily reports will appear here so you can track them over time.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center gap-2">
          <AlertCircle className="w-8 h-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No {filter} problems.{" "}
            <button
              onClick={() => setFilter("all")}
              className="underline hover:text-foreground"
            >
              Show all
            </button>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((problem) => (
            <ProblemCard
              key={problem.title}
              problem={problem}
              onToggle={handleToggle}
            />
          ))}
          {filter !== "all" && (
            <button
              onClick={() => setFilter("all")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
            >
              <RotateCcw className="w-3 h-3" />
              Show all {counts.all} problems
            </button>
          )}
        </div>
      )}

      {/* AI info banner */}
      {problems && problems.length > 0 && !problems.some((p) => p.aiEvidence) && (
        <Card className="border-indigo-500/20 bg-indigo-500/5">
          <CardContent className="py-4 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
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
