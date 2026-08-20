"use client";

import { trackerColor, trackerInitial } from "@/lib/trackers";
import { cn } from "@/lib/utils";

/**
 * Tracker identity mark: a tinted glass chip with the tracker's initial in its
 * own color. Replaces emojis everywhere (no icons, no decoration - just the
 * letter and the color the tracker already owns).
 */
export function TrackerMark({
  name,
  color,
  size = 40,
  className,
}: {
  name?: string;
  color?: string;
  size?: number;
  className?: string;
}) {
  const c = trackerColor(color);
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center rounded-2xl font-semibold leading-none", className)}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.4),
        color: c,
        background: `color-mix(in oklch, ${c} 16%, transparent)`,
        border: `1px solid color-mix(in oklch, ${c} 28%, transparent)`,
      }}
    >
      {trackerInitial(name)}
    </span>
  );
}
