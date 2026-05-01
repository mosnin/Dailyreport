"use client";

import { useEffect, useRef, useState } from "react";

const THRESHOLD = 72;   // px pulled before triggering
const MAX_PULL = 100;   // px max visual travel

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      // Only activate when page is scrolled to top
      if (window.scrollY > 2) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!pulling.current || refreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) { setPullDistance(0); return; }
      // Resist: pull feels heavier the further it goes
      const resisted = Math.min(delta * 0.45, MAX_PULL);
      // Haptic at threshold crossing
      if (resisted >= THRESHOLD && pullDistance < THRESHOLD) {
        try { navigator.vibrate?.(8); } catch {}
      }
      setPullDistance(resisted);
      if (delta > 8) e.preventDefault(); // prevent page bounce while pulling
    }

    function onTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistance >= THRESHOLD) {
        setRefreshing(true);
        setPullDistance(THRESHOLD); // hold at threshold during refresh
        onRefresh().finally(() => {
          setRefreshing(false);
          setPullDistance(0);
        });
      } else {
        setPullDistance(0);
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullDistance, refreshing, onRefresh]);

  return { pullDistance, refreshing };
}
