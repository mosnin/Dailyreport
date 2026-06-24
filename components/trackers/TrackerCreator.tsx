"use client";

import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { trackerColor, type TrackerDraft, type TrackerField } from "@/lib/trackers";
import { TRACKER_TEMPLATES } from "@/lib/trackerTemplates";
import { toast } from "sonner";
import { motion } from "motion/react";

const PROMPTS = [
  "Track my fitness: workouts, protein, sleep and weight",
  "Help me stay sober: cravings, mood, days clean",
  "Track my startup: revenue, new users, hours shipped",
  "Learning Spanish: minutes studied, new words, confidence",
];

const FIELD_TYPES: TrackerField["type"][] = ["number", "scale", "boolean", "duration", "text"];

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
    if (!text.trim()) return;
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

  function patchField(i: number, patch: Partial<TrackerField>) {
    setDraft((d) => (d ? { ...d, fields: d.fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) } : d));
  }
  function removeField(i: number) {
    setDraft((d) => (d ? { ...d, fields: d.fields.filter((_, idx) => idx !== i) } : d));
  }
  function addField() {
    setDraft((d) =>
      d ? { ...d, fields: [...d.fields, { key: `field${d.fields.length}`, label: "New field", type: "number", direction: "higher", weight: 0.2 }] } : d
    );
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      if (mode === "edit" && trackerId) {
        await update({
          trackerId,
          name: draft.name,
          emoji: draft.emoji,
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
          emoji: draft.emoji,
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
                onClick={() => { setDraft(t); setReply(`Loaded the ${t.name} template - tweak it or save.`); }}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-white/5"
              >
                <span>{t.emoji}</span> {t.name}
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
          placeholder={draft ? "Refine with AI, e.g. add a meditation field" : "I want to track..."}
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button onClick={() => send(message)} disabled={loading || !message.trim()} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {loading ? "Thinking..." : "Send"}
        </button>
      </div>

      {reply && <p className="mt-3 text-sm text-foreground/90">{reply}</p>}

      {/* Draft preview + light manual editing */}
      {draft && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border border-border bg-background/40 p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl text-xl" style={{ background: trackerColor(draft.color) }}>{draft.emoji}</span>
            <div className="flex-1">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full bg-transparent text-base font-semibold focus:outline-none"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <button onClick={() => setDraft({ ...draft, cadence: draft.cadence === "daily" ? "weekly" : "daily" })} className="capitalize underline-offset-2 hover:underline">
                  {draft.cadence}
                </button>
                <span>· {draft.fields.length} fields</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {draft.fields.map((f, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-background/40 p-2.5">
                <div className="flex items-center gap-2">
                  <input value={f.label} onChange={(e) => patchField(i, { label: e.target.value })} className="flex-1 bg-transparent text-sm font-medium focus:outline-none" />
                  <select value={f.type} onChange={(e) => patchField(i, { type: e.target.value as TrackerField["type"] })} className="rounded-lg border border-border bg-background px-1.5 py-1 text-xs">
                    {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button onClick={() => removeField(i)} className="text-xs text-muted-foreground/60 hover:text-rose-400 px-1">remove</button>
                </div>
                {f.type !== "text" && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-14">weight</span>
                    <input type="range" min={0} max={1} step={0.05} value={f.weight} onChange={(e) => patchField(i, { weight: Number(e.target.value) })} className="flex-1 accent-[var(--primary)]" />
                    <span className="text-[11px] text-muted-foreground numeral w-8 text-right">{Math.round(f.weight * 100)}%</span>
                  </div>
                )}
              </div>
            ))}
            <button onClick={addField} className="text-xs text-muted-foreground hover:text-foreground">+ Add field</button>
          </div>

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
