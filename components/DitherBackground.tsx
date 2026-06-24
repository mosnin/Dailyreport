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
        waveColor={[0.5372549019607843, 0.6941176470588235, 0.996078431372549]}
        disableAnimation={false}
        enableMouseInteraction
        mouseRadius={0.3}
        colorNum={3.3}
        waveAmplitude={0}
        waveFrequency={3.2}
        waveSpeed={0.06}
      />
    </div>
  );
}
