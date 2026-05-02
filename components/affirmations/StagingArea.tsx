"use client";

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Check, X } from "lucide-react";

type StagingItem = {
  id: string;
  text: string;
  status: "pending" | "accepted" | "dismissed";
};

const ease = [0.16, 1, 0.3, 1] as const;

export function StagingArea({
  items,
  onAccept,
  onDismiss,
  onDone,
}: {
  items: StagingItem[];
  onAccept: (id: string) => void | Promise<void>;
  onDismiss: (id: string) => void;
  onDone: () => void;
}): React.JSX.Element {
  const pending = items.filter((i) => i.status === "pending");
  const decided = items.length - pending.length;
  const accepted = items.filter((i) => i.status === "accepted").length;
  const allDecided = pending.length === 0 && items.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease }}
      className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4 space-y-3"
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-500" />
          <span className="text-sm font-semibold">
            {allDecided ? "All reviewed" : "AI suggestions"}
          </span>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">
          {decided} / {items.length} decided
        </span>
      </div>

      {!allDecided && (
        <AnimatePresence mode="popLayout">
          {pending.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.22 } }}
              transition={{ duration: 0.3, ease }}
              className="rounded-xl border border-border bg-card px-4 py-3 flex items-start gap-3"
            >
              <p className="flex-1 text-sm leading-relaxed">{item.text}</p>
              <div className="shrink-0 flex items-center gap-1.5 mt-0.5">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => onDismiss(item.id)}
                  title="Skip"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => onAccept(item.id)}
                  title="Keep"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {allDecided && (
        <div className="text-center py-3 space-y-3">
          <p className="text-sm text-muted-foreground">
            {accepted > 0
              ? `${accepted} affirmation${accepted === 1 ? "" : "s"} added to your list.`
              : "None kept — generate again to try new ones."}
          </p>
          <button
            onClick={onDone}
            className="text-xs text-sky-500 hover:text-sky-400 font-medium transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </motion.div>
  );
}
