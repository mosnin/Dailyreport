"use client";

import dynamic from "next/dynamic";

// WebGL canvas — load on the client only (no SSR).
const Dither = dynamic(() => import("./Dither"), { ssr: false });

/**
 * Fixed, full-viewport animated dither background that sits behind the entire
 * app. pointer-events are disabled so the UI stays fully clickable; the shader
 * still tracks the cursor via a window-level listener.
 */
export function DitherBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ width: "100%", height: "100%" }}
    >
      <Dither
        waveColor={[0.96, 0.76, 0.86]}
        waveColor2={[0.78, 0.73, 0.95]}
        waveColor3={[0.7, 0.9, 0.88]}
        waveContrast={1.6}
        disableAnimation={false}
        enableMouseInteraction
        mouseRadius={0.3}
        colorNum={3.3}
        waveAmplitude={0}
        waveFrequency={3.2}
        waveSpeed={0.06}
      />
      {/* Soften so foreground text/cards stay legible over the animation */}
      <div className="absolute inset-0 bg-background/55 dark:bg-background/60" />
    </div>
  );
}
