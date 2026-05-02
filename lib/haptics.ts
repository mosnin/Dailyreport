// Tiny haptic feedback shim for PWA installs on Android and any browser
// exposing navigator.vibrate. iOS Safari (including PWA) does not expose
// vibrate; calls are silently ignored there, which is the correct fallback.

function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // some browsers throw on certain patterns; ignore
  }
}

export const haptics = {
  light:   () => vibrate(8),
  medium:  () => vibrate(15),
  heavy:   () => vibrate(25),
  success: () => vibrate([8, 30, 8]),
  warning: () => vibrate([15, 50, 15]),
  error:   () => vibrate([30, 60, 30, 60, 30]),
};
