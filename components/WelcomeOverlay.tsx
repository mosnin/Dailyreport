"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { TypingAnimation } from "@/components/magicui/typing-animation";

export function WelcomeOverlay() {
  const { user, isLoaded } = useUser();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("welcome-shown") === "1") return;
    sessionStorage.setItem("welcome-shown", "1");
    setShow(true);
    const timer = setTimeout(() => setShow(false), 2400);
    return () => clearTimeout(timer);
  }, []);

  if (!isLoaded) return null;

  const firstName = user?.firstName ?? null;
  const greeting = firstName ? `Welcome Back, ${firstName}` : "Welcome Back";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="lg:hidden fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center gap-6"
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
          <TypingAnimation
            className="text-2xl font-semibold text-neutral-900 leading-tight tracking-tight"
            duration={55}
            delay={300}
          >
            {greeting}
          </TypingAnimation>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
