"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { todayString } from "@/lib/utils";

// Placeholder questions — replace with the actual questions when provided
const QUESTIONS = [
  { id: "wins", label: "What were your wins today?" },
  { id: "challenges", label: "What challenges did you face?" },
  { id: "learned", label: "What did you learn?" },
  { id: "tomorrow", label: "What's your top priority for tomorrow?" },
];

export function DailyReportForm({
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
  const submitDaily = useMutation(api.reports.submitDaily);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await submitDaily({ userId, date: todayString(), responses });
      toast.success("Daily report submitted!");
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
        {saving ? "Saving..." : "Submit daily report"}
      </Button>
    </form>
  );
}
