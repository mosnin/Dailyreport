"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { DAILY_REPORT_TEMPLATE } from "@/lib/trackerTemplates";
import { TrackerMark } from "@/components/trackers/TrackerMark";
import { toast } from "sonner";

/**
 * One-tap add for the built-in Daily Report. Gives a brand-new user scoring out
 * of the box without designing anything, reviving the classic daily reflection.
 */
export function QuickStartDailyReport({
  userId,
  onCreated,
}: {
  userId: Id<"users">;
  onCreated?: (id: string) => void;
}) {
  const create = useMutation(api.trackers.create);
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function add() {
    if (saving) return;
    setSaving(true);
    try {
      const { name, color, description, cadence, fields } = DAILY_REPORT_TEMPLATE;
      const id = await create({ userId, name, color, description, cadence, fields });
      toast.success("Daily Report added");
      if (onCreated) onCreated(id as unknown as string);
      else router.push(`/trackers/${id}`);
    } catch {
      toast.error("Could not add it. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      onClick={add}
      disabled={saving}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background/40 p-3 text-left transition-colors hover:bg-white/5 disabled:opacity-60"
    >
      <TrackerMark name={DAILY_REPORT_TEMPLATE.name} color={DAILY_REPORT_TEMPLATE.color} size={40} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Start with the Daily Report</p>
        <p className="text-xs text-muted-foreground">{DAILY_REPORT_TEMPLATE.description}</p>
      </div>
      <span className="shrink-0 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground">
        {saving ? "Adding..." : "Add"}
      </span>
    </button>
  );
}
