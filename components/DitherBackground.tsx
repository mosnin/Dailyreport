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
      style={{ zIndex: 0, width: "100vw", height: "100dvh" }}
    >
      <Dither
        waveColor={[0.5372549019607843, 0.6941176470588235, 0.996078431372549]}
        disableAnimation={false}
        enableMouseInteraction
        mouseRadius={0.3}
        colorNum={3.3}
        waveAmplitude={0.3}
        waveFrequency={3.2}
        waveSpeed={0.4}
      />
    </div>
  );
}
