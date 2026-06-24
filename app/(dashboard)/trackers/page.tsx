"use client";

import { useState } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { BentoCard } from "@/components/bento/BentoCard";
import { ScoreRing } from "@/components/bento/ScoreRing";
import { PageHeader } from "@/components/bento/PageHeader";
import { trackerColor, scoreLabel, type TrackerDraft } from "@/lib/trackers";
import { toast } from "sonner";
import { motion } from "motion/react";

const PROMPTS = [
  "Track my fitness: workouts, protein, sleep and weight",
  "Help me stay sober: cravings, mood, days clean",
  "Track my startup: revenue, new users, hours shipped",
  "Learning Spanish: minutes studied, new words, confidence",
];

export default function TrackersPage() {
  const { convexUserId } = useConvexUser();
  const overview = useQuery(api.trackers.getOverview, convexUserId ? { userId: convexUserId } : "skip");
  const design = useAction(api.trackerAI.design);
  const create = useMutation(api.trackers.create);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<TrackerDraft | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function send(text: string) {
    if (!text.trim() || !convexUserId) return;
    setLoading(true);
    try {
      const res = await design({ userId: convexUserId, message: text, current: draft ?? undefined });
      setReply(res.reply);
      if (res.tracker) setDraft(res.tracker as TrackerDraft);
      setMessage("");
    } catch {
      toast.error("Could not design that. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft() {
    if (!draft || !convexUserId) return;
    setSaving(true);
    try {
      await create({
        userId: convexUserId,
        name: draft.name,
        emoji: draft.emoji,
        color: draft.color,
        description: draft.description,
        cadence: draft.cadence,
        fields: draft.fields,
      });
      toast.success(`${draft.name} created`);
      setDraft(null);
      setReply(null);
    } catch {
      toast.error("Could not save tracker.");
    } finally {
      setSaving(false);
    }
  }

  const trackers = overview?.trackers ?? [];

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        eyebrow="Trackers"
        title="Measure anything"
        subtitle="Describe what you want to track and AI builds the log, the scoring and the charts."
      />

      {/* AI designer */}
      <BentoCard delay={0.02}>
        <h2 className="font-semibold mb-1">Create a tracker with AI</h2>
        <p className="text-sm text-muted-foreground mb-3">Tell it what you care about. You can refine before saving.</p>

        {!draft && (
          <div className="mb-3 flex flex-wrap gap-2">
            {PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                disabled={loading}
                className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(message)}
            placeholder={draft ? "Refine it, e.g. add a meditation field" : "I want to track..."}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={() => send(message)}
            disabled={loading || !message.trim()}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? "Thinking..." : "Send"}
          </button>
        </div>

        {reply && <p className="mt-3 text-sm text-foreground/90">{reply}</p>}

        {/* Draft preview */}
        {draft && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-2xl border border-border bg-background/40 p-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl text-xl" style={{ background: trackerColor(draft.color) }}>
                {draft.emoji}
              </span>
              <div>
                <p className="font-semibold">{draft.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{draft.cadence} · {draft.fields.length} fields</p>
              </div>
            </div>
            {draft.description && <p className="text-sm text-muted-foreground mb-3">{draft.description}</p>}
            <div className="space-y-1.5 mb-4">
              {draft.fields.map((f) => (
                <div key={f.key} className="flex items-center justify-between text-sm">
                  <span>{f.label} <span className="text-xs text-muted-foreground">· {f.type}{f.unit ? ` (${f.unit})` : ""}</span></span>
                  {f.weight > 0 && <span className="text-xs text-muted-foreground numeral">{Math.round(f.weight * 100)}%</span>}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={saveDraft} disabled={saving} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {saving ? "Creating..." : "Create tracker"}
              </button>
              <button onClick={() => { setDraft(null); setReply(null); }} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
                Discard
              </button>
            </div>
          </motion.div>
        )}
      </BentoCard>

      {/* Existing trackers */}
      {overview === undefined ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-3xl" />)}
        </div>
      ) : trackers.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {trackers.map((t: any, i: number) => {
            const color = trackerColor(t.color);
            return (
              <BentoCard key={t._id} href={`/trackers/${t._id}`} className="flex flex-col gap-3" delay={0.04 + i * 0.03}>
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl text-lg" style={{ background: color }}>{t.emoji}</span>
                  {!t.needsData && t.trend !== 0 && (
                    <span className={`text-xs font-medium ${t.trend > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {t.trend > 0 ? "+" : ""}{t.trend}
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold numeral">{t.needsData ? "-" : t.score}</span>
                    {!t.needsData && <span className="text-xs text-muted-foreground">/ 100</span>}
                  </div>
                  <p className="text-sm font-medium mt-0.5 truncate">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.needsData ? "No data yet" : scoreLabel(t.score)}</p>
                </div>
              </BentoCard>
            );
          })}
        </div>
      ) : (
        <BentoCard className="text-center py-10">
          <p className="font-semibold">No trackers yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first one above and it appears here instantly.</p>
        </BentoCard>
      )}
    </div>
  );
}
