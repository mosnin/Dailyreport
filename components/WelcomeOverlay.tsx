"use client";

import { useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  animate,
  useMotionValue,
  useTransform,
} from "motion/react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import Image from "next/image";
import { Flame } from "lucide-react";
import { TypingAnimation } from "@/components/magicui/typing-animation";

type Phase = "typing" | "streak";

function StreakDisplay({ streak }: { streak: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(count, streak, {
      duration: 0.95,
      ease: [0.16, 1, 0.3, 1],
      delay: 0.18,
    });
    return () => controls.stop();
  }, [count, streak]);

  return (
    <motion.div
      key="streak"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col items-center gap-3"
    >
      <motion.div
        initial={{ scale: 0.4, rotate: -16, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 13, stiffness: 180, delay: 0.05 }}
      >
        <Flame
          className="w-9 h-9 text-orange-500 fill-orange-500/15"
          strokeWidth={2.2}
        />
      </motion.div>
      <motion.span className="text-[64px] font-bold tabular-nums text-orange-500 leading-none tracking-tight">
        {rounded}
      </motion.span>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.95 }}
        className="text-sm text-neutral-500 font-medium"
      >
        day{streak === 1 ? "" : "s"} in a row
      </motion.p>
    </motion.div>
  );
}

export function WelcomeOverlay() {
  const { user, isLoaded } = useUser();
  const { convexUserId } = useConvexUser();
  const stats = useQuery(
    api.users.getStats,
    convexUserId ? { userId: convexUserId } : "skip",
  );
  const streak = stats?.streak ?? 0;

  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<Phase>("typing");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("welcome-shown") === "1") return;
    sessionStorage.setItem("welcome-shown", "1");
    setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;

    // Wait for stats before deciding whether to show the streak phase.
    // If stats hasn't resolved within the typing window, hold the overlay
    // for a bit longer (capped at 3s) so users on slow connections still
    // get the streak reveal — but never hang the splash forever.
    const statsReady = stats !== undefined;
    const decisionDelay = statsReady ? 1850 : 3000;

    const transitionTimer = setTimeout(() => {
      if (statsReady && streak > 0) {
        setPhase("streak");
        setTimeout(() => setShow(false), 2000);
      } else {
        setShow(false);
      }
    }, decisionDelay);

    return () => clearTimeout(transitionTimer);
  }, [show, stats, streak]);

  if (!isLoaded) return null;

  const firstName = user?.firstName ?? null;
  const greeting = firstName ? `Welcome Back, ${firstName}` : "Welcome Back";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="welcome"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="lg:hidden fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center gap-7"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image
              src="/favicon.png"
              alt="DailyReport"
              width={70}
              height={70}
              className="w-[70px] h-[70px]"
              priority
            />
          </motion.div>

          <div className="min-h-[160px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {phase === "typing" ? (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  <TypingAnimation
                    className="text-xl font-semibold text-neutral-900 leading-tight tracking-tight"
                    duration={55}
                    delay={300}
                  >
                    {greeting}
                  </TypingAnimation>
                </motion.div>
              ) : (
                <StreakDisplay streak={streak} />
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
