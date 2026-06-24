# Ascend - Design System

This is the design system. Read it once. Then write code that disappears into it.

The product is a **life-analytics dashboard**, not a notebook. Dark, vibrant, tile-based. Big numerals, bold sans, lots of negative space. Every surface is a bento tile. Color carries meaning - each life area owns a hue.

> The old warm "notebook" aesthetic (Lora serif, cream paper, ruled lines, violet) has been fully removed. Do not reintroduce it.

---

## Stack & Libraries

- **Framework**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind v4 - configured via `@theme inline` inside `app/globals.css`. No `tailwind.config.js`.
- **Components**: ShadCN/UI v4 over `@base-ui/react` primitives (in `components/ui/`)
- **Icons**: `lucide-react` only.
- **Animation**: `motion` (Framer Motion).
- **Theme**: `next-themes` - **default is dark**. Light is a supported secondary.
- **Charts**: `recharts`, always via the wrappers in `components/charts/Charts.tsx`.
- **Toasts**: `sonner`.
- **Fonts**: `Geist Sans` (everything) + `Geist Mono` (numerals where useful). One family. `font-heading` = Geist with tight tracking.

---

## Color System

`oklch`. Dark-first. The defining move: **each life area has its own accent**, exposed as a CSS variable and usable inline (`style={{ color: "var(--health)" }}`) and as a Tailwind color (`text-health`, `bg-finance`, …).

| Area | Var | Hue |
|---|---|---|
| Health | `--health` | emerald |
| Goals | `--goals` | violet |
| Finance | `--finance` | amber |
| Emotional | `--emotional` | rose |
| Progress | `--progress` | sky |
| Execution | `--execution` | orange |
| Brand / primary | `--primary` | yellow |

Core tokens: `--background`, `--foreground`, `--card`, `--muted`, `--muted-foreground`, `--accent`, `--border`, `--ring`, `--sidebar*`, `--chart-1…6`. Always use tokens - never raw grays.

`--radius` is `1.25rem` (bento needs big radii).

---

## The bento language

Everything is a tile. Use the primitives - don't hand-roll card chrome.

- **`BentoCard`** (`components/bento/BentoCard.tsx`) - the atomic surface. Props: `tint?` (a CSS color var → vibrant solid tile with dark text), `href?`, `onClick?`, `className?`, `delay?`. Renders padding (`p-5`), border, radius (`1.75rem`), inner highlight + drop shadow, and an entrance animation. Override padding with `!p-6` when wrapping forms.
- **`BentoGrid`** - responsive `grid-cols-2 lg:grid-cols-4`. Most pages just use a raw `grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4` and size tiles with `col-span-2`, `lg:row-span-2`, etc.
- **`ScoreRing`** - circular gauge. `value` (0-100), `color`, `size?`, `stroke?`, `track?`, centered children.
- **`PageHeader`** - every page opens with `<PageHeader eyebrow title subtitle? action? />`.
- **Charts** (`components/charts/Charts.tsx`): `LineTrend`, `AreaTrend`, `ScatterPlot`, `RadarScores`. Theme-aware; pass series colors as area vars.

`lib/areas.ts` is the source of truth for area → {label, color, icon, blurb, href}. `lib/nav.ts` is the source of truth for navigation (sidebar, bottom bar, command palette all read it).

---

## Typography

- Headings / big numbers: `font-heading font-bold tracking-tight`.
- Display numerals: add the `numeral` class (`tabular-nums` + tight tracking). Always on scores, counts, money, dates.
- Body: `text-sm`. Muted/meta: `text-xs text-muted-foreground`.
- Section eyebrow: `text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60`.

---

## Patterns

- **Page shell**: `<div className="space-y-4 pb-6">` → `<PageHeader/>` → bento grid(s).
- **Inputs**: `w-full bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring`.
- **Primary button**: `bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-semibold`. Or a tinted action: `style={{ background: "var(--area)" }}` + `text-[oklch(0.2_0.03_264)]`.
- **Loading**: `Skeleton` with `rounded-3xl` until `convexUserId` and the main query resolve.
- **Guard queries**: `useQuery(api.x.y, convexUserId ? { userId: convexUserId, … } : "skip")`.
- **Empty states**: a muted BentoCard with a one-line hint + a link to the relevant report.

---

## Banned

- The notebook aesthetic (serif headings, ruled `writing-lines`/`notebook-lines`, cream backgrounds). These CSS classes are now no-ops.
- Mixing icon libraries. Hardcoded grays. Card chrome built by hand instead of `BentoCard`.
