"use client";

import dynamic from "next/dynamic";

const Dither = dynamic(() => import("./Dither"), { ssr: false });

/**
 * Fixed, full-viewport animated dither background behind the entire app.
 * pointer-events are disabled so the UI stays clickable; the shader still
 * tracks the cursor via a window-level listener.
 */
export function DitherBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 0, width: "100vw", height: "100dvh", isolation: "isolate" }}
    >
      <Dither
        waveColor={[0.88, 0.88, 0.88]}
        waveContrast={2}
        disableAnimation={false}
        enableMouseInteraction
        mouseRadius={0.3}
        colorNum={7.2}
        waveAmplitude={0.27}
        waveFrequency={1.5}
        waveSpeed={0.07}
      />
      {/* Recolor the neutral dither into a pastel gradient (blend keeps the
          dither's black-dominant luminance, swaps in soft hues across the
          screen). Component is untouched. */}
      <div
        className="absolute inset-0"
        style={{
          mixBlendMode: "color",
          backgroundImage:
            "linear-gradient(135deg, #dfb3c8 0%, #b5abdd 38%, #9cc4dd 72%, #a3d8c6 100%)",
        }}
      />
    </div>
  );
}
