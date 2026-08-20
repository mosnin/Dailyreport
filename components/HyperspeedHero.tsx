"use client";

import dynamic from "next/dynamic";

const Hyperspeed = dynamic(() => import("./Hyperspeed"), { ssr: false });

// Memoized at module scope so the WebGL scene is not recreated on re-render.
const EFFECT_OPTIONS = {
  distortion: "turbulentDistortion",
  length: 400,
  roadWidth: 9,
  islandWidth: 2,
  lanesPerRoad: 3,
  fov: 90,
  fovSpeedUp: 150,
  speedUp: 2,
  carLightsFade: 0.4,
  totalSideLightSticks: 50,
  lightPairsPerRoadWay: 50,
  shoulderLinesWidthPercentage: 0.05,
  brokenLinesWidthPercentage: 0.1,
  brokenLinesLengthPercentage: 0.5,
  lightStickWidth: [0.12, 0.5],
  lightStickHeight: [1.3, 1.7],
  movingAwaySpeed: [60, 80],
  movingCloserSpeed: [-120, -160],
  carLightsLength: [20, 60],
  carLightsRadius: [0.05, 0.14],
  carWidthPercentage: [0.3, 0.5],
  carShiftX: [-0.2, 0.2],
  carFloorSeparation: [0.05, 1],
  colors: {
    roadColor: 0x080808,
    islandColor: 0x0a0a0a,
    background: 0x000000,
    shoulderLines: 0x131318,
    brokenLines: 0x131318,
    leftCars: [0xdc5bda, 0xdc8460, 0xdc3260],
    rightCars: [0x334fb7, 0xe5e6ed, 0xbfc3f3],
    sticks: 0xc5e6eb,
  },
};

/** Full-bleed Hyperspeed animation for the logged-out landing hero. */
export function HyperspeedHero() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Hyperspeed effectOptions={EFFECT_OPTIONS as any} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-neutral-950" />
    </div>
  );
}
