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
        waveColor={[1.0, 0.72, 0.86]}
        waveColor2={[0.72, 0.68, 1.0]}
        waveColor3={[0.62, 0.95, 0.85]}
        waveContrast={1.3}
        waveGain={1.9}
        disableAnimation={false}
        enableMouseInteraction
        mouseRadius={0.3}
        colorNum={4.5}
        waveAmplitude={0}
        waveFrequency={3.2}
        waveSpeed={0.06}
      />
      {/* Soften so foreground text/cards stay legible over the animation.
          Neutral black so it darkens without tinting the pastel gradient. */}
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
}
