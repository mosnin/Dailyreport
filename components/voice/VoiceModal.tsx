"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useRealtimeAgent } from "@/hooks/useRealtimeAgent";
import { VoiceOrb } from "./VoiceOrb";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { currentPeriodKey, todayString } from "@/lib/utils";

const STATE_LABEL: Record<string, string> = {
  idle:       "Ready",
  connecting: "Connecting…",
  listening:  "Listening",
  speaking:   "Speaking",
  error:      "Connection failed",
};

export function VoiceModal() {
  const [open, setOpen] = useState(false);
  const { convexUserId } = useConvexUser();

  const addGoalMutation      = useMutation(api.goals.add);
  const addProblemMutation   = useMutation(api.reports.addProblemToToday);
  const addAffirmation       = useMutation(api.affirmations.add);
  const patchTodayMutation   = useMutation(api.reports.patchToday);

  const { state, transcript, actionLog, connect, disconnect } = useRealtimeAgent({
    addGoal: async (title, category) => {
      if (!convexUserId) return;
      await addGoalMutation({
        userId: convexUserId,
        category,
        periodKey: currentPeriodKey(category),
        title,
      });
    },
    addProblem: async (title) => {
      if (!convexUserId) return;
      await addProblemMutation({ userId: convexUserId, title, date: todayString() });
    },
    addAffirmation: async (text) => {
      if (!convexUserId) return;
      await addAffirmation({ userId: convexUserId, text, source: "manual" });
    },
    patchReport: async (field, value) => {
      if (!convexUserId) return;
      await patchTodayMutation({ userId: convexUserId, field, value, date: todayString() });
    },
  });

  // Global open trigger (same pattern as command palette)
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("open-voice-agent", handler);
    return () => window.removeEventListener("open-voice-agent", handler);
  }, []);

  // Keyboard: Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Connect / disconnect on open state
  useEffect(() => {
    if (open) {
      connect();
    } else {
      disconnect();
    }
  // connect/disconnect are stable refs — open is the only dependency that matters
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[300] bg-background/97 backdrop-blur-md flex flex-col"
          style={{
            paddingTop: "env(safe-area-inset-top)",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
            <span className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/30 select-none">
              Voice
            </span>
            <motion.button
              onClick={handleClose}
              whileTap={{ scale: 0.9 }}
              className="w-8 h-8 rounded-full bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          </div>

          {/* Center — orb + status */}
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <VoiceOrb state={state} />
            </motion.div>

            {/* State label */}
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/30 select-none">
              {STATE_LABEL[state] ?? state}
            </p>

            {/* Live transcript */}
            <AnimatePresence mode="wait">
              {transcript ? (
                <motion.p
                  key={transcript.slice(0, 20)}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm text-muted-foreground/50 max-w-xs text-center leading-relaxed font-heading italic"
                >
                  {transcript}
                </motion.p>
              ) : (
                <motion.p
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-muted-foreground/25 text-center select-none"
                >
                  {state === "error"
                    ? "Check microphone permissions and try again"
                    : state === "listening"
                    ? "Say anything — add a goal, log a problem, update your plan"
                    : ""}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Action log */}
          <div className="shrink-0 px-6 pb-2 min-h-[4rem] flex flex-col justify-end gap-1.5">
            <AnimatePresence>
              {actionLog.slice(0, 4).map((entry) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex items-center gap-2 text-xs text-muted-foreground/40"
                >
                  <span className="w-1 h-1 rounded-full bg-emerald-400/70 shrink-0" />
                  {entry.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Bottom hint */}
          <p className="text-center text-[10px] text-muted-foreground/20 pb-8 select-none shrink-0">
            esc to close
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
