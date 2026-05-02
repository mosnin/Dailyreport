"use client";

import { motion } from "motion/react";
import { Mic, Loader2 } from "lucide-react";
import type { AgentState } from "@/hooks/useRealtimeAgent";

const COLORS: Record<AgentState, { orb: string; ring: string; icon: string }> = {
  idle:       { orb: "from-slate-600/20 to-slate-700/10", ring: "border-slate-500/20", icon: "text-slate-400/50" },
  connecting: { orb: "from-violet-500/30 to-blue-500/20",  ring: "border-violet-400/30", icon: "text-violet-300/80" },
  listening:  { orb: "from-blue-500/40 to-indigo-500/30",  ring: "border-blue-400/50",   icon: "text-blue-300/90" },
  speaking:   { orb: "from-amber-400/40 to-orange-500/30", ring: "border-amber-400/50",  icon: "text-amber-300/90" },
  error:      { orb: "from-red-500/30 to-rose-600/20",     ring: "border-red-400/40",    icon: "text-red-300/80" },
};

export function VoiceOrb({ state }: { state: AgentState }) {
  const c = COLORS[state];

  return (
    <div className="relative w-56 h-56 flex items-center justify-center select-none">

      {/* Speaking ripples */}
      {state === "speaking" && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full border border-amber-400/15"
            animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border border-amber-400/10"
            animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
          />
        </>
      )}

      {/* Listening pulse */}
      {state === "listening" && (
        <motion.div
          className="absolute inset-0 rounded-full border border-blue-400/25"
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Core orb */}
      <motion.div
        className={`relative w-40 h-40 rounded-full bg-gradient-to-br ${c.orb} border ${c.ring} flex items-center justify-center overflow-hidden`}
        animate={{
          scale:
            state === "speaking"  ? [1, 1.08, 1.02, 1] :
            state === "listening" ? [1, 1.03, 1] :
            state === "connecting"? [1, 1.04, 1] :
            [1, 1.015, 1],
        }}
        transition={{
          duration:
            state === "speaking"  ? 0.9 :
            state === "listening" ? 2.0 :
            state === "connecting"? 1.0 : 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Inner soft glow */}
        <div className={`absolute inset-8 rounded-full bg-gradient-to-br ${c.orb} blur-xl opacity-70`} />

        {/* Icon */}
        <div className="relative z-10">
          {state === "connecting" ? (
            <Loader2 className={`w-9 h-9 ${c.icon} animate-spin`} />
          ) : (
            <Mic className={`w-9 h-9 ${c.icon} transition-colors duration-500`} />
          )}
        </div>
      </motion.div>
    </div>
  );
}
