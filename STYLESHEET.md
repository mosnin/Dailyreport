# Stylesheet

This is the design system. Read it once. Then write code that disappears into it.

The product is a notebook, not a dashboard. Warm, quiet, disciplined. Type does the work. Chrome does not.

---

## Stack & Libraries

- **Framework**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind v4 — configured via `@theme inline` inside `app/globals.css`. There is no `tailwind.config.js`. Do not add one.
- **Components**: ShadCN/UI v4 wrapped over `@base-ui/react` primitives
- **Icons**: `lucide-react` only. One icon library. No mixing.
- **Animation**: `motion` (formerly Framer Motion). No CSS keyframe libraries.
- **Theme**: `next-themes` for light/dark
- **Toasts**: `sonner`
- **Charts**: `recharts` (used inside AI insight chat)
- **Fonts**: `Geist Sans` (body) + `Lora` (headings) — both via `next/font/google`

**Banned**: confetti of any kind. Celebrations are loud. We are quiet.

---

## Typography

Two families. That is the whole system.

- **Lora** — every heading, every large numeral. Loaded as `font-heading`.
- **Geist Sans** — body, UI, labels, everything else.

### Scale

```
Dashboard greeting   font-heading text-[2.1rem] font-semibold tracking-tight leading-[1.15]
Daily date heading   font-heading text-[2.2rem] font-semibold tracking-tight leading-[1.15]
Page h1 (interior)   font-heading text-[1.9rem] font-semibold tracking-tight leading-tight
Section eyebrow      text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground/40
Body                 text-sm           (14px)
Journal text         text-[15px]
Meta                 text-xs           (12px)
Timestamps           text-[11px]
```

### Rules

- Numerals on counters, streaks, scores, and dates use `tabular-nums`. Always.
- Never put an icon inside an `h1`. The word stands alone.
- Body text is never larger than the heading above it.
- Headings carry weight; body does not. If you find yourself bolding paragraphs, you have the wrong heading.

---

## Color System

The palette is `oklch`. It is warm. There are no neutral grays anywhere.

### Light

```
background   oklch(0.985 0.005 85)    warm cream
foreground   oklch(0.16  0.012 60)
primary      oklch(0.36  0.13  268)   deep violet
border       oklch(0.87  0.007 78)
muted        oklch(0.94  0.006 80)
```

### Dark

```
background   oklch(0.115 0.008 50)    warm charcoal
foreground   oklch(0.94  0.005 80)
primary      oklch(0.73  0.14  268)   soft violet
```

### Brand Blue

```
brand-blue  #559cc9 (light) / #6daed8 (dark)
```

Reserved. Landing CTAs, hero accent, sign-in/sign-up CTA. Nowhere else inside the product. Brand-blue persuades a stranger; violet leads a user already inside.

### State Colors

- `emerald` — success
- `rose` — destructive
- `amber` — warning
- `orange` — streaks (the only place orange ever appears in product)

### Radius Tokens

```
--radius: 0.5rem
sm  0.6x   md  0.8x   lg  1.0x   xl  1.4x   2xl 1.8x   3xl 2.2x   4xl 2.6x
```

---

## Spacing Scale

4px base. No ad hoc values.

### Page

- Page padding: `p-4 md:p-6`
- Page max-width on focused surfaces (dashboard, daily): `max-w-lg`

### Vertical Rhythm

```
space-y-6    standard between sections
space-y-8    breathing — dashboard, marketing
space-y-10   major — landing-page chapter breaks
```

### Cards

```
p-4    compact / list cell
p-5    primary
p-6    primary (taller)
p-8    hero
```

### Forms

- Input padding: `px-3 py-2`

### Inline Gaps

```
gap-1.5   icon + label
gap-2     tight rows
gap-3     comfortable rows
```

---

## Border & Radius

Rounded, but never bubbly.

```
Buttons          rounded-lg
Landing CTAs     rounded-full   (pill)
Nav items        rounded-xl     (active state)
Cards            rounded-xl     default
Hero cards       rounded-2xl
Inputs           rounded-lg
Modals           rounded-xl
Badges / pills   rounded-full
```

### Borders

- Notebook textarea: **no border**, only `border-b border-border/35`. The user is writing on a page, not inside a box.
- Dividers: `border-border/30` to `border-border/50`. Always semi-transparent. A hard divider is a wall; we want a whisper.

---

## Shadows

Use them like seasoning.

- Most surfaces: `ring-1 ring-foreground/10`. Not shadow. A ring is a hairline; a shadow is a claim.
- Cards have **no default shadow**.
- Brand CTA only: `shadow-lg shadow-brand-blue/25` or `shadow-xl shadow-brand-blue/20`.

If you reach for a shadow, ask first whether a ring will do. It usually will.

---

## Components

### Buttons (`components/ui/button.tsx`)

Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`.

Heights:

```
xs       24px
sm       28px
default  32px
lg       36px
```

Press feedback: `translate-y-px` — a tactile sink, not a bounce.

**No `asChild`.** ShadCN v4 over base-ui does not support it. Use a plain `<Link className="...">` styled to match. Do not fight this.

### Cards

```
rounded-xl bg-card ring-1 ring-foreground/10
```

But understand: cards are not mandatory. The Settings page is the proof — a typographic list with thin dividers reads better than a stack of boxes. Reach for a card only when the content is genuinely a unit.

### Inputs

```
rounded-lg border border-input bg-background px-3 py-2 text-sm
```

**Notebook variant** — for daily/weekly journal fields:

- No outer border
- Bottom border only: `border-b border-border/35`
- The cursor sits on a line of paper. Nothing else.

### Modals (Dialog, base-ui)

```
rounded-xl p-4 ring-1 ring-foreground/10
```

A modal is an interruption. Keep it small and quiet.

### Badges

Pills.

```
rounded-full text-[10px] font-semibold tracking-[0.14em] uppercase
```

### Tables

We don't use them in product. If you need a tabular list, build it from the `Row` + `SectionLabel` pattern in Settings. A table with borders is a spreadsheet; we are not a spreadsheet.

---

## Navigation

### Desktop Sidebar

- Width: `w-56` (224px) expanded, `w-[60px]` collapsed
- Visibility: `hidden lg:flex`
- Collapse state persists via `localStorage`

### Section Labels

```
text-[10px] font-semibold tracking-[0.14em] uppercase text-muted-foreground/40
```

When the sidebar is collapsed, replace the label with a thin divider. The label is a wayfinder; if the words can't be read, draw a line instead.

### NavItem

```
Active     bg-primary text-primary-foreground rounded-xl
Inactive   text-muted-foreground hover:bg-accent hover:text-foreground
```

### Mobile

- `Sheet` drawer, `w-72` (288px)
- Hamburger trigger in the top bar
- Same NavItem styles inside

### Top Progress Strip

Three dots + streak flame. That is the entire ambient progress UI. No progress bars. No percentages.

---

## Visual Hierarchy Rules

There is one job per screen. The page should make that job obvious without instruction.

- **Primary action** — the one thing the user is here to do next. `bg-foreground text-background` inside the app, or brand-blue on landing. Big, unambiguous, alone.
- **Secondary** — supports the primary. `outline` or `ghost`.
- **Tertiary** — nav, metadata, breadcrumbs. Muted text, no chrome.

### Levers, in order of last resort

1. **Size** beats weight.
2. **Weight** beats color.
3. **Color** is the last lever. Never the first.

If something is not standing out, make it bigger before you make it darker, and make it darker before you make it colored.

### Numerals

Streaks, dates, scores, accuracy: Lora, large, `tabular-nums`. Numbers are a feature; treat them like one.

### Body never outranks its heading

If a paragraph reads heavier than the title above it, the title is wrong, not the paragraph.

---

## Animation & Interactions

`motion` only.

### Standard easing

```ts
const ease = [0.16, 1, 0.3, 1]
```

### fadeUp (the workhorse)

```tsx
initial={{ opacity: 0, y: 10 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.55, ease, delay }}
```

### Staggered lists

```ts
delay: 0.25 + index * 0.07   // standard
delay: 0.25 + index * 0.055  // tighter, when rows are dense
```

### Hero spring (large numbers, streak count)

```ts
transition={{ type: "spring", damping: 12, stiffness: 90 }}
```

### Page transitions

Handled by `components/layout/PageTransition.tsx`. Wrap `{children}` in `<PageTransition>` inside the dashboard layout — never on individual pages.

```tsx
// components/layout/PageTransition.tsx
"use client";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 min-h-0"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

- `duration: 0.2` — fast enough to feel instant; slow enough to feel smooth
- `y: 8` enter / `y: -4` exit — asymmetric: enters from slightly below, exits upward. Implies forward momentum.
- `mode="wait"` — outgoing page fully exits before the new one enters
- `initial={false}` — suppresses the transition on first page load

### Button press

```tsx
whileTap={{ scale: 0.98 }}
```

That is the entire interaction vocabulary. If you need more, you are decorating.

---

## Dashboard Homepage

The most important page. The most restrained page.

```
max-w-lg space-y-8
```

Narrow column. Focused. The user opens this and knows immediately what to do.

### Two states

**BEFORE the daily report is filled** — one massive CTA, nothing else competing:

```
bg-foreground text-background rounded-2xl px-8 py-7
```

**AFTER the daily report is filled** — the streak becomes the hero:

```
font-heading text-[80px] font-bold tabular-nums text-orange-500
```

That number is the reward. Give it the room.

### Greeting

```
font-heading text-[2.1rem]
```

The anchor of the page. Always present. Personal.

### Morning Brief

Italic Lora, left border accent, small. A whisper, not a banner.

---

## Auth Pages

The user is mid-action. Do not interrupt them.

- Background: `bg-background notebook-lines` — the same warm cream + ruling as the dashboard. **Never** cold dark gradients here.
- The Clerk widget sits centered. The page is the frame; the widget is the content.
- **Zero marketing copy.** No taglines, no value props, no "Welcome back!". They already chose to be here.
- Brand expression on these pages is restraint. The product earns trust by getting out of the way.

---

## The Notebook Signature

The `.notebook-lines` utility (in `globals.css`) is the product's signature. It appears on:

- The landing hero
- Sign-in
- Sign-up
- The daily form mockup on landing

Rule: **any "pause" surface earns the lines. Working surfaces do not.**

Reading, signing in, marketing — pause. Filling in the daily report inside the app — work. Don't put lines on dashboards, settings, or chat. The lines are a promise; cashing them everywhere makes them noise.

---

## Founding Rules

- **Warm, not cold.** Every color is `oklch` with chroma. Neutral gray is forbidden.
- **Words, not chrome.** Typography is the design. If a problem can be solved with type, solve it with type.
- **Discipline, not celebration.** No confetti, no emoji, no party. The reward is the streak.
- **One color leads, one color persuades.** Violet inside the product. Brand-blue on the way in.
- **The page is a notebook, not a dashboard.** When in doubt, remove a border.
