"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

type BentoCardProps = {
  children: React.ReactNode;
  className?: string;
  /** Solid vibrant tint keyed to a CSS color var (e.g. "var(--health)") */
  tint?: string;
  href?: string;
  onClick?: () => void;
  interactive?: boolean;
  delay?: number;
};

/**
 * The atomic bento surface. Either a plain card or a vibrant tinted tile.
 * Becomes a link or button when href/onClick provided.
 */
export function BentoCard({
  children,
  className,
  tint,
  href,
  onClick,
  interactive,
  delay = 0,
}: BentoCardProps) {
  const isInteractive = interactive ?? (!!href || !!onClick);
  const style = tint
    ? ({ background: tint, borderColor: "transparent" } as React.CSSProperties)
    : undefined;

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay }}
      className={cn(
        "bento p-5 h-full",
        tint && "tile-tint",
        isInteractive && "bento-hover cursor-pointer",
        className
      )}
      style={style}
    >
      {children}
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
