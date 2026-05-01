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
  Gauge,
  NotepadText,
  Flame,
  Telescope,
  BookOpen,
  Crosshair,
  AlertCircle,
  Heart,
  BrainCircuit,
  Zap,
  Users,
  CalendarDays,
  Lightbulb,
  Search,
  SlidersHorizontal,
  Sparkles,
  ArrowRight,
} from "lucide-react";

const PAGES = [
  { label: "Today",          href: "/dashboard",      icon: Gauge },
  { label: "Daily Report",   href: "/reports/daily",  icon: NotepadText },
  { label: "Weekly Review",  href: "/reports/weekly", icon: BookOpen },
  { label: "Affirmations",   href: "/affirmations",   icon: Flame },
  { label: "Visualizations", href: "/dreams",         icon: Telescope },
  { label: "Goals",          href: "/goals",          icon: Crosshair },
  { label: "Problems",       href: "/problems",       icon: AlertCircle },
  { label: "Giving",         href: "/giving",         icon: Heart },
  { label: "Progress",       href: "/insights",       icon: BrainCircuit },
  { label: "Energy",         href: "/energy",         icon: Zap },
  { label: "People",         href: "/people",         icon: Users },
  { label: "History",        href: "/calendar",       icon: CalendarDays },
  { label: "Inspiration",    href: "/inspiration",    icon: Lightbulb },
  { label: "Settings",       href: "/settings",       icon: SlidersHorizontal },
];

const ACTIONS = [
  { label: "Begin today's daily report",   href: "/reports/daily", icon: ArrowRight },
  { label: "Start affirmations practice",  href: "/affirmations",  icon: Sparkles },
  { label: "Run visualizations",           href: "/dreams",        icon: Sparkles },
  { label: "Generate today's inspiration", href: "/inspiration",   icon: Sparkles },
  { label: "Search reports",               href: "/search",        icon: Search },
  { label: "Ask AI about your data",       href: "/chat",          icon: Sparkles },
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
