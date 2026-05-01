"use client";

import { useEffect, useState, useRef, ElementType } from "react";
import { motion, MotionProps } from "motion/react";
import { cn } from "@/lib/utils";

interface TypingAnimationProps extends MotionProps {
  children: string;
  className?: string;
  duration?: number;       // ms per character
  delay?: number;          // ms before typing starts
  as?: ElementType;
  startOnView?: boolean;
}

export function TypingAnimation({
  children,
  className,
  duration = 100,
  delay = 0,
  as: Component = "div",
  startOnView = false,
  ...props
}: TypingAnimationProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MotionComponent = motion.create(Component as any) as any;
  const [displayedText, setDisplayedText] = useState("");
  const [started, setStarted] = useState(!startOnView);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!startOnView) {
      const t = setTimeout(() => setStarted(true), delay);
      return () => clearTimeout(t);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setStarted(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    if (elementRef.current) observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [delay, startOnView]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const id = setInterval(() => {
      if (i < children.length) {
        setDisplayedText(children.substring(0, i + 1));
        i++;
      } else {
        clearInterval(id);
      }
    }, duration);
    return () => clearInterval(id);
  }, [children, duration, started]);

  return (
    <MotionComponent
      ref={(el: HTMLElement | null) => {
        elementRef.current = el;
      }}
      className={cn(
        "text-4xl font-bold leading-[5rem] tracking-[-0.02em]",
        className,
      )}
      {...props}
    >
      {displayedText}
    </MotionComponent>
  );
}
