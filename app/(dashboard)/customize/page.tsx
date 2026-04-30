"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { Skeleton } from "@/components/ui/skeleton";
import { Flame, Telescope, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { fadeUp, listVariants, itemVariants } from "@/lib/motion";

// ── Style definitions ─────────────────────────────────────────────────────

type StyleOption = {
  key: string;
  label: string;
  description: string;
  example: string;
};

const AFFIRMATION_STYLES: StyleOption[] = [
  {
    key: "grateful",
    label: "Gratitude",
    description: "Heartfelt present-tense gratitude. The classic 'I am so happy and grateful' format.",
    example: "I am so happy and grateful that I am a multi-millionaire living in total financial freedom, waking each morning with purpose and peace.",
  },
  {
    key: "power",
    label: "Power Declaration",
    description: "Short, commanding, and direct. Bold statements that own the reality without softness.",
    example: "I run a seven-figure business. Every decision I make compounds my success. I am built for this — and this is built for me.",
  },
  {
    key: "spiritual",
    label: "Spiritual",
    description: "Universe, energy, and divine alignment. Deep connection to something greater than yourself.",
    example: "The universe has already delivered this into my reality. I am a vessel of infinite abundance, in perfect alignment with every dream I hold.",
  },
  {
    key: "poetic",
    label: "Poetic",
    description: "Lyrical, metaphorical language. Evocative imagery rooted specifically in your dreams.",
    example: "Like a river that carves through stone with patient certainty, I have carved my path — and wealth now flows to me as naturally as water finds the sea.",
  },
  {
    key: "identity",
    label: "Identity-Based",
    description: "Focuses on who you ARE, not just what you have. Deep identity statements.",
    example: "I am the kind of person who builds extraordinary things. Creating wealth is not something I chase — it is simply who I am at my core.",
  },
  {
    key: "custom",
    label: "Custom",
    description: "Write your own format instructions. The AI will follow them exactly.",
    example: "",
  },
];

const VISUALIZATION_STYLES: StyleOption[] = [
  {
    key: "cinematic",
    label: "Cinematic",
    description: "Full-sensory movie scenes. You are inside the moment — sight, sound, body, emotion.",
    example: "You are seated at your desk, laptop glowing in the quiet room, the number on your screen impossible to misread: $1,000,000. Your breath catches. The weight of it — real, solid, undeniable — settles into your chest like something that was always supposed to be there.",
  },
  {
    key: "meditative",
    label: "Meditative",
    description: "Slow, peaceful, breath-anchored awareness. No drama — just deep knowing that it has arrived.",
    example: "Breathe in slowly. Feel the warmth spreading across your chest. Beneath the noise of ordinary life you sense it — the deep, unshakeable knowing that everything you worked for has arrived. There is no urgency here. Only stillness, and a quiet, permanent peace.",
  },
  {
    key: "athletic",
    label: "Peak Performance",
    description: "Adrenaline, physical power, warrior energy. You are fully dialed in at the moment of victory.",
    example: "The number hits your screen and your entire nervous system fires at once. Chest tight, jaw set, every nerve alive. This is what you trained for — not some distant dream but this exact moment. You exhale slowly, and the power in that exhale says everything.",
  },
  {
    key: "spiritual",
    label: "Spiritual",
    description: "Light, energy, divine presence. Your higher self witnessing the dream fulfilled.",
    example: "Feel the light expanding from your heart center, reaching outward in all directions. Your higher self observes this moment with quiet certainty — this was always the destination, written into your path long before you could see it. The universe kept its promise. You kept yours.",
  },
  {
    key: "narrative",
    label: "Narrative Arc",
    description: "Story with a before and after. The contrast between who you were and who you are now.",
    example: "There was a time you weren't sure you had it in you — those 3am moments when the gap between where you were and where you wanted to be felt infinite. Now you sit in the light of what you built. That version of you needed this moment. You gave it to them.",
  },
  {
    key: "custom",
    label: "Custom",
    description: "Write your own style instructions. The AI will follow them exactly.",
    example: "",
  },
];

// ── Style card ────────────────────────────────────────────────────────────

function StyleCard({
  option,
  selected,
  onSelect,
}: {
  option: StyleOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      onClick={onSelect}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "relative w-full text-left rounded-2xl border p-4 transition-all",
        selected
          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent/30"
      )}
    >
      {selected && (
        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-primary-foreground" />
        </span>
      )}
      <p className="text-sm font-semibold mb-0.5 pr-6">{option.label}</p>
      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{option.description}</p>
      {option.example && (
        <p className="text-xs italic text-muted-foreground/70 leading-relaxed border-l-2 border-border pl-3">
          &ldquo;{option.example}&rdquo;
        </p>
      )}
    </motion.button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function CustomizePage() {
  const { convexUserId, convexUser, isLoading } = useConvexUser() as {
    convexUser: {
      affirmationStyle?: string;
      affirmationCustomInstructions?: string;
      visualizationStyle?: string;
      visualizationCustomInstructions?: string;
    } | null | undefined;
    convexUserId: import("@/convex/_generated/dataModel").Id<"users"> | null;
    isLoading: boolean;
  };

  const updateStyles = useMutation(api.users.updateStyles);

  const [affirmStyle, setAffirmStyle] = useState("grateful");
  const [affirmCustom, setAffirmCustom] = useState("");
  const [vizStyle, setVizStyle] = useState("cinematic");
  const [vizCustom, setVizCustom] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Seed from saved user prefs
  useEffect(() => {
    if (!convexUser) return;
    setAffirmStyle(convexUser.affirmationStyle ?? "grateful");
    setAffirmCustom(convexUser.affirmationCustomInstructions ?? "");
    setVizStyle(convexUser.visualizationStyle ?? "cinematic");
    setVizCustom(convexUser.visualizationCustomInstructions ?? "");
    setDirty(false);
  }, [convexUser]);

  async function handleSave() {
    if (!convexUserId) return;
    setSaving(true);
    try {
      await updateStyles({
        userId: convexUserId,
        affirmationStyle: affirmStyle,
        affirmationCustomInstructions: affirmStyle === "custom" ? affirmCustom : undefined,
        visualizationStyle: vizStyle,
        visualizationCustomInstructions: vizStyle === "custom" ? vizCustom : undefined,
      });
      setDirty(false);
      toast.success("Style preferences saved. New generations will use these settings.");
    } catch {
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading || !convexUserId) {
    return (
      <div className="max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-10">
      {/* Header */}
      <motion.div {...fadeUp(0)}>
        <h1 className="font-heading text-[1.9rem] font-semibold tracking-tight leading-tight">Personalize</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how your affirmations and visualizations are written. Applied the next time you generate.
        </p>
      </motion.div>

      {/* Affirmation style */}
      <motion.section {...fadeUp(0.08)} className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Flame className="w-5 h-5 text-amber-500" />
          <div>
            <h2 className="font-heading text-lg font-semibold">Affirmation Style</h2>
            <p className="text-xs text-muted-foreground">How AI-generated affirmations are written and framed.</p>
          </div>
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={listVariants}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {AFFIRMATION_STYLES.map((opt) => (
            <motion.div key={opt.key} variants={itemVariants}>
              <StyleCard
                option={opt}
                selected={affirmStyle === opt.key}
                onSelect={() => { setAffirmStyle(opt.key); setDirty(true); }}
              />
            </motion.div>
          ))}
        </motion.div>

        <AnimatePresence>
          {affirmStyle === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden space-y-2"
            >
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Your format instructions
              </label>
              <textarea
                value={affirmCustom}
                onChange={(e) => { setAffirmCustom(e.target.value); setDirty(true); }}
                placeholder="e.g. Each affirmation should start with 'I choose...' and be written as a firm decision rather than a statement of current reality. Keep each to one short sentence."
                rows={4}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none placeholder:text-muted-foreground/50"
              />
              <p className="text-xs text-muted-foreground/60">
                Be specific. Describe the opening format, tone, length, and any phrases to use or avoid.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      <div className="border-t border-border" />

      {/* Visualization style */}
      <motion.section {...fadeUp(0.14)} className="space-y-4">
        <div className="flex items-center gap-2.5">
          <Telescope className="w-5 h-5 text-sky-500" />
          <div>
            <h2 className="font-heading text-lg font-semibold">Visualization Style</h2>
            <p className="text-xs text-muted-foreground">The tone and energy of your daily dream scenarios.</p>
          </div>
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={listVariants}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {VISUALIZATION_STYLES.map((opt) => (
            <motion.div key={opt.key} variants={itemVariants}>
              <StyleCard
                option={opt}
                selected={vizStyle === opt.key}
                onSelect={() => { setVizStyle(opt.key); setDirty(true); }}
              />
            </motion.div>
          ))}
        </motion.div>

        <AnimatePresence>
          {vizStyle === "custom" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden space-y-2"
            >
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Your style instructions
              </label>
              <textarea
                value={vizCustom}
                onChange={(e) => { setVizCustom(e.target.value); setDirty(true); }}
                placeholder="e.g. Write each visualization as a 3rd-person observer watching the user succeed. Use past tense as if recounting a memory. Include specific numbers and sensory details."
                rows={4}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none placeholder:text-muted-foreground/50"
              />
              <p className="text-xs text-muted-foreground/60">
                Describe the perspective, tense, pacing, energy level, and any specific language patterns you want.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Save */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <p className="text-xs text-muted-foreground">
          Changes apply to new generations only — existing affirmations are unaffected.
        </p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save preferences"}
        </motion.button>
      </div>
    </div>
  );
}
