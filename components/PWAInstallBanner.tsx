"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Download, X, Share } from "lucide-react";

type Platform = "android" | "ios" | null;

export function PWAInstallBanner() {
  const [platform, setPlatform] = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Already dismissed
    if (localStorage.getItem("pwa-install-dismissed") === "1") return;

    // iOS Safari detection
    const isIOS =
      /iPhone|iPad|iPod/.test(navigator.userAgent) &&
      !(window.navigator as any).standalone;

    if (isIOS) {
      setPlatform("ios");
      setVisible(true);
      return;
    }

    // Android: wait for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPlatform("android");
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem("pwa-install-dismissed", "1");
    setVisible(false);
  }

  async function handleAdd() {
    if (platform === "android" && deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setVisible(false);
      }
      setDeferredPrompt(null);
    } else if (platform === "ios") {
      toast('Tap the share button below, then tap "Add to Home Screen".', {
        icon: <Share className="h-4 w-4 shrink-0" />,
        duration: 6000,
      });
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="pwa-install-banner"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="lg:hidden fixed left-0 right-0 z-[39] px-4"
          style={{
            bottom: "calc(4.5rem + env(safe-area-inset-bottom) + 0.5rem)",
          }}
        >
          <div className="bg-card border border-border/60 shadow-lg rounded-2xl mx-0 px-4 py-3 flex items-center gap-3">
            <Download className="h-5 w-5 shrink-0 text-muted-foreground" />

            <p className="flex-1 text-sm text-foreground leading-snug">
              Add to your home screen for the best experience
            </p>

            <button
              onClick={handleAdd}
              className="shrink-0 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              {platform === "ios" ? "How?" : "Add"}
            </button>

            <button
              onClick={dismiss}
              aria-label="Dismiss install banner"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
