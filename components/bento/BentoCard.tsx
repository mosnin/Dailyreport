"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
// GlassSurface is plain JS (no types) - imported as the universal card surface.
import GlassSurface from "@/components/GlassSurface";

type BentoCardProps = {
  children: React.ReactNode;
  className?: string;
  /** accepted for backwards-compat; cards are uniform glass, so this is ignored */
  tint?: string;
  href?: string;
  onClick?: () => void;
  interactive?: boolean;
  delay?: number;
};

const Glass = GlassSurface as unknown as React.ComponentType<{
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  backgroundOpacity?: number;
  blur?: number;
  displace?: number;
  distortionScale?: number;
  brightness?: number;
  opacity?: number;
  className?: string;
}>;

/**
 * The universal card surface: a glass tile that floats over the animated
 * background. No icons, tints, or ornamental chrome live here - only content.
 */
export function BentoCard({
  children,
  className,
  href,
  onClick,
  interactive,
  delay = 0,
}: BentoCardProps) {
  const isInteractive = interactive ?? (!!href || !!onClick);

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay }}
      className={cn("h-full w-full", isInteractive && "bento-hover")}
    >
      <Glass
        width="100%"
        height="100%"
        borderRadius={28}
        backgroundOpacity={0.4}
        blur={12}
        displace={1.2}
        distortionScale={-150}
        className={cn("glass-card h-full w-full", className)}
      >
        <div className="h-full w-full p-5">{children}</div>
      </Glass>
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block h-full w-full text-left">
        {inner}
      </button>
    );
  }
  return inner;
}

export function BentoGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-[minmax(0,1fr)]",
        className
      )}
    >
      {children}
    </div>
  );
}
