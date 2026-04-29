"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { currentWeekStartString } from "@/lib/utils";

// Placeholder questions — replace with the actual questions when provided
const QUESTIONS = [
  { id: "accomplishments", label: "What were your biggest accomplishments this week?" },
  { id: "struggles", label: "What did you struggle with?" },
  { id: "progress", label: "How did you progress on your goals?" },
  { id: "next_week", label: "What are your top 3 priorities for next week?" },
  { id: "gratitude", label: "What are you grateful for this week?" },
];

export function WeeklyReportForm({
  userId,
  initialResponses,
}: {
  userId: Id<"users">;
  initialResponses?: Record<string, string>;
}) {
  const [responses, setResponses] = useState<Record<string, string>>(
    initialResponses ?? {}
  );
  const [saving, setSaving] = useState(false);
  const submitWeekly = useMutation(api.reports.submitWeekly);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await submitWeekly({
        userId,
        weekStartDate: currentWeekStartString(),
        responses,
      });
      toast.success("Weekly report submitted!");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {QUESTIONS.map((q) => (
        <Card key={q.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{q.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={responses[q.id] ?? ""}
              onChange={(e) =>
                setResponses((prev) => ({ ...prev, [q.id]: e.target.value }))
              }
              placeholder="Type your answer..."
              className="min-h-[80px] resize-none"
            />
          </CardContent>
        </Card>
      ))}
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Saving..." : "Submit weekly report"}
      </Button>
    </form>
  );
}
