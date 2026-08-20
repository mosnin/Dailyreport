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
        waveColor={[0.1843137254901961, 0.3176470588235294, 0.615686274509804]}
        disableAnimation={false}
        enableMouseInteraction
        mouseRadius={0.3}
        colorNum={7.2}
        waveAmplitude={0.27}
        waveFrequency={1.5}
        waveSpeed={0.07}
      />
      {/* Recolor the single-hue dither into a gradient (blend keeps the dither
          texture, swaps the color across the screen). Component is untouched. */}
      <div
        className="absolute inset-0"
        style={{
          mixBlendMode: "color",
          backgroundImage:
            "linear-gradient(135deg, #3b5bff 0%, #7c4dff 38%, #2bb6c9 72%, #16c79a 100%)",
        }}
      />
    </div>
  );
}
