"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { trackerColor, weightLabel, fieldMeaning, type TrackerDraft } from "@/lib/trackers";
import { TRACKER_TEMPLATES } from "@/lib/trackerTemplates";
import { TrackerMark } from "@/components/trackers/TrackerMark";
import { toast } from "sonner";
import { motion } from "motion/react";

const PROMPTS = [
  "Track my fitness: workouts, protein, sleep and weight",
  "Help me stay sober: cravings, mood, days clean",
  "Track my startup: revenue, new users, hours shipped",
  "Learning Spanish: minutes studied, new words, confidence",
];

/**
 * AI-only tracker builder. The user describes what they want; the AI designs the
 * fields and the scoring. There is no manual field or weight editing - to change
 * anything, you talk to the AI ("make sleep matter more", "add a meditation field").
 */
export function TrackerCreator({
  userId,
  mode = "create",
  trackerId,
  initial,
  showTemplates = true,
  onSaved,
}: {
  userId: Id<"users">;
  mode?: "create" | "edit";
  trackerId?: Id<"trackers">;
  initial?: TrackerDraft;
  showTemplates?: boolean;
  onSaved?: (id?: string) => void;
}) {
  const design = useAction(api.trackerAI.design);
  const create = useMutation(api.trackers.create);
  const update = useMutation(api.trackers.update);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [draft, setDraft] = useState<TrackerDraft | null>(initial ?? null);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setLoading(true);
    try {
      const res = await design({ userId, message: text, current: draft ?? undefined });
      setReply(res.reply);
      if (res.tracker) setDraft(res.tracker as TrackerDraft);
      setMessage("");
    } catch {
      toast.error("Could not design that. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      if (mode === "edit" && trackerId) {
        await update({
          trackerId,
          name: draft.name,
          color: draft.color,
          description: draft.description,
          cadence: draft.cadence,
          fields: draft.fields,
        });
        toast.success("Tracker updated");
        onSaved?.(trackerId);
      } else {
        const id = await create({
          userId,
          name: draft.name,
          color: draft.color,
          description: draft.description,
          cadence: draft.cadence,
          fields: draft.fields,
        });
        toast.success(`${draft.name} created`);
        onSaved?.(id as unknown as string);
        setDraft(null);
        setReply(null);
      }
    } catch {
      toast.error("Could not save tracker.");
    } finally {
      setSaving(false);
    }
  }

  const accent = draft ? trackerColor(draft.color) : "var(--primary)";

  return (
    <div>
      {/* Templates */}
      {showTemplates && mode === "create" && !draft && (
        <div className="mb-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">Start from a template</p>
          <div className="flex flex-wrap gap-2">
            {TRACKER_TEMPLATES.map((t) => (
              <button
                key={t.name}
                onClick={() => { setDraft(t); setReply(`Loaded ${t.name}. Save it, or tell me how to change it.`); }}
                className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium hover:bg-white/5"
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Example prompts */}
      {mode === "create" && !draft && (
        <div className="mb-3 flex flex-wrap gap-2">
          {PROMPTS.map((p) => (
            <button key={p} onClick={() => send(p)} disabled={loading} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">
              {p}
            </button>
          ))}
        </div>
      )}

      {/* AI input */}
      <div className="flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(message)}
          placeholder={draft ? "Tell the AI what to change..." : "Describe what you want to track..."}
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button onClick={() => send(message)} disabled={loading || !message.trim()} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {loading ? "Thinking..." : draft ? "Update" : "Build it"}
        </button>
      </div>

      {reply && <p className="mt-3 text-sm text-foreground/90">{reply}</p>}

      {/* Read-only draft preview - the AI owns the structure and scoring */}
      {draft && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border border-border bg-background/40 p-4">
          <div className="mb-4 flex items-center gap-3">
            <TrackerMark name={draft.name} color={draft.color} size={44} />
            <div className="flex-1 min-w-0">
              <p className="truncate text-base font-semibold">{draft.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{draft.cadence} · {draft.fields.length} things to log</p>
            </div>
          </div>

          {draft.description && <p className="mb-3 text-sm text-muted-foreground">{draft.description}</p>}

          <div className="space-y-2 mb-4">
            {draft.fields.map((f, i) => {
              const scored = (f.weight ?? 0) > 0 && f.type !== "text";
              return (
                <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/40 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{f.label}</p>
                    <p className="text-xs text-muted-foreground">{fieldMeaning(f)}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={
                      scored
                        ? { color: accent, background: `color-mix(in oklch, ${accent} 14%, transparent)` }
                        : { color: "var(--muted-foreground)", background: "color-mix(in oklch, var(--muted-foreground) 12%, transparent)" }
                    }
                  >
                    {weightLabel(f.weight)}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="mb-3 text-xs text-muted-foreground/70">Want it different? Just tell the AI above - it handles the structure and scoring for you.</p>

          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {saving ? "Saving..." : mode === "edit" ? "Save changes" : "Create tracker"}
            </button>
            <button onClick={() => { if (mode === "edit") { onSaved?.(); } else { setDraft(null); setReply(null); } }} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              {mode === "edit" ? "Cancel" : "Discard"}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
