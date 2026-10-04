"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
type BentoCardProps = {
  children: React.ReactNode;
  className?: string;
  /** accepted for backwards-compat; cards are uniform, so this is ignored */
  tint?: string;
  href?: string;
  onClick?: () => void;
  interactive?: boolean;
  delay?: number;
};

// Grid-placement classes must sit on the grid item (the outer wrapper); all
// other classes (flex, padding, sizing, text) belong on the padded interior.
function partition(className?: string) {
  const grid: string[] = [];
  const rest: string[] = [];
  for (const c of (className ?? "").split(/\s+/).filter(Boolean)) {
    if (/(^|:)(col-span|row-span|col-start|col-end|row-start|row-end|order)-/.test(c)) grid.push(c);
    else rest.push(c);
  }
  return { grid: grid.join(" "), rest: rest.join(" ") };
}

/**
 * The universal card surface: a flat, soft gray rounded tile.
 * No icons, tints, or ornamental chrome - only content.
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
  const { grid, rest } = partition(className);

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay }}
      className={cn("bento h-full w-full", isInteractive && "bento-hover")}
    >
      <div className={cn("h-full w-full p-5", rest)}>{children}</div>
    </motion.div>
  );

  const itemClass = cn("relative block h-full min-h-0 w-full", grid);

  if (href) {
    return (
      <Link href={href} className={itemClass}>
        {inner}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(itemClass, "text-left")}>
        {inner}
      </button>
    );
  }
  return <div className={itemClass}>{inner}</div>;
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
        "grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 auto-rows-[minmax(7rem,auto)]",
        className
      )}
    >
      {children}
    </div>
  );
}
