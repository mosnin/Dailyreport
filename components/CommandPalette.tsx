"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import {
  HeartPulse,
  GraduationCap,
  FolderKanban,
  Search,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { NAV } from "@/lib/nav";

const PAGES = [
  ...NAV.flatMap((s) => s.items.map((i) => ({ label: i.label, href: i.href, icon: i.icon }))),
  { label: "Finances", href: "/finances", icon: Sparkles },
  { label: "Settings", href: "/settings", icon: SlidersHorizontal },
];

const ACTIONS = [
  { label: "Begin today's daily report",   href: "/reports/daily",      icon: ArrowRight },
  { label: "Log health & wellness",        href: "/reports/health",     icon: HeartPulse },
  { label: "Log a learning session",       href: "/reports/education",  icon: GraduationCap },
  { label: "Update project progress",      href: "/reports/projects",   icon: FolderKanban },
  { label: "Start affirmations practice",  href: "/affirmations",       icon: Sparkles },
  { label: "Search reports",               href: "/search",             icon: Search },
  { label: "Ask AI about your data",       href: "/chat",               icon: Sparkles },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    function openHandler() { setOpen(true); }
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", openHandler);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", openHandler);
    };
  }, []);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="p-0 sm:max-w-xl max-w-xl overflow-hidden border border-border/60 bg-popover shadow-2xl gap-0"
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <Command shouldFilter loop className="bg-transparent">
          <CommandInput placeholder="Type a page, action, or search…" autoFocus />
          <CommandList className="max-h-[420px] overflow-y-auto p-2">
            <CommandEmpty>Nothing found.</CommandEmpty>

            <CommandGroup heading="Pages">
              {PAGES.map((p) => {
                const Icon = p.icon;
                return (
                  <CommandItem
                    key={p.href}
                    value={`page ${p.label}`}
                    onSelect={() => go(p.href)}
                  >
                    <Icon className="w-4 h-4 text-muted-foreground/60" />
                    <span>{p.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Actions">
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <CommandItem
                    key={a.label}
                    value={`action ${a.label}`}
                    onSelect={() => go(a.href)}
                  >
                    <Icon className="w-4 h-4 text-muted-foreground/60" />
                    <span>{a.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>

          <div className="border-t border-border/50 px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground/50">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">↵</kbd>
              open
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono">esc</kbd>
              close
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
