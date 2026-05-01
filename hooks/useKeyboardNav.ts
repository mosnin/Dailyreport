"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Gmail-style two-key navigation: press `g` then a destination letter
// within 1.2 seconds. Skipped while the user is typing into any input
// or contenteditable surface.
const ROUTES: Record<string, string> = {
  d: "/dashboard",
  r: "/reports/daily",
  w: "/reports/weekly",
  a: "/affirmations",
  v: "/dreams",
  g: "/goals",
  p: "/insights",
  e: "/energy",
  c: "/calendar",
  i: "/inspiration",
  s: "/settings",
};

export function useKeyboardNav() {
  const router = useRouter();

  useEffect(() => {
    let armed = false;
    let armedAt = 0;

    function isTypingTarget(el: EventTarget | null): boolean {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return false;
    }

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const key = e.key.toLowerCase();
      const now = Date.now();

      if (armed && now - armedAt < 1200) {
        const dest = ROUTES[key];
        if (dest) {
          e.preventDefault();
          router.push(dest);
        }
        armed = false;
        return;
      }

      if (key === "g") {
        armed = true;
        armedAt = now;
      } else {
        armed = false;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);
}
