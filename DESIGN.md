# Design System — Liikuntahakemisto

## Overview

**Creative North Star:** Nopea ja luotettava — Wolt-energia liikunnalle. Asiat löytyvät heti, ei yhtään ylimääräistä. Luottamus syntyy selkeydestä.

**Register:** Product (app UI serving a goal, design is invisible infrastructure)

**Tone:** Selkeä, reipas, paikallinen. Ei byrokraattinen, ei aggressiivinen myynti. Tieto edellä, toiminta aina yhden napin päässä.

---

## Colors

### Core palette

| Role | Token | Hex | When |
|---|---|---|---|
| Page background | `bg-[#EEF2FF]` / `bg-indigo-50` | `#EEF2FF` | All page backgrounds, wave SVG fill |
| Hero / NavBar | `bg-[#4F46E5]` / `bg-indigo-600` | `#4F46E5` | Top nav, hero sections |
| Accent / CTA | `bg-[#6366F1]` / `bg-indigo-500` | `#6366F1` | Active buttons, CTA, active filter pills |
| Accent hover | `hover:bg-indigo-600` | `#4F46E5` | Button hover state |
| Card surface | `bg-white` | `#FFFFFF` | All cards, nav |
| Heading text | `text-[#1E1B4B]` | `#1E1B4B` | Card titles, price, primary text |
| Body text | `text-[#6B7280]` | `#6B7280` | Descriptions, addresses, muted labels |
| Hero subtitle | `text-indigo-200` | `#C7D2FE` | Subtitle text on dark hero |
| Filter inactive | `text-[#6B7280] border-indigo-100` | — | Unselected filter pills |

### Sport-type colors (from `lib/lajit.ts`)

| Sport | Badge | Accent bar |
|---|---|---|
| Padel | `bg-blue-100 text-blue-700` | `bg-blue-500` |
| Tennis | `bg-green-100 text-green-700` | `bg-green-500` |
| Jooga | `bg-purple-100 text-purple-700` | `bg-purple-500` |
| Kuntosali | `bg-orange-100 text-orange-700` | `bg-orange-500` |
| Uinti | `bg-cyan-100 text-cyan-700` | `bg-cyan-500` |
| Liikuntahalli | `bg-indigo-100 text-indigo-700` | `bg-indigo-500` |
| Liikunta | `bg-sky-100 text-sky-700` | `bg-sky-400` |

Sport colors are defined exclusively in `lib/lajit.ts`. Never inline sport colors in components.

### Color strategy

**Restrained** — tinted neutrals + one accent (indigo-500/600) across ≤10% of surface. Background and cards are neutral. Hero/nav uses the full indigo saturation as a deliberate anchor. Sport accent bars are the only chromatic pop inside cards.

---

## Typography

**Font:** Inter (`next/font/google`), variable `--font-sans`

| Role | Classes | Usage |
|---|---|---|
| Hero heading | `text-3xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight` | Main page title |
| Profile heading | `text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight` | Detail page title |
| Card title | `font-bold text-[#1E1B4B] text-[17px] leading-snug tracking-tight` | Venue name in card |
| Body / description | `text-sm text-[#6B7280] leading-relaxed` | Descriptions, addresses |
| Label caps | `text-xs font-bold text-gray-400 uppercase tracking-wide` | Section labels (Puhelin, Hinta, Kuvaus) |
| Price | `text-lg font-bold text-[#1E1B4B] tabular-nums` (card) / `text-xl font-bold text-indigo-600` (detail) | Pricing display |
| Badge | `text-xs font-semibold px-2.5 py-1 rounded-full` | Sport type labels |
| Filter pill | `text-sm font-semibold` | Laji filter buttons |
| Hero subtitle | `text-sm sm:text-base font-medium tracking-wide text-indigo-200` | "Tampere · N paikkaa" |
| Nav logo | `font-bold text-lg tracking-tight text-white` | NavBar brand |
| Bottom nav label | `text-xs font-medium` | Tab labels |

Scale contrast between hero heading (5xl/extrabold) and body (sm) creates clear hierarchy. Price uses tabular-nums to prevent layout shift as values change.

---

## Elevation

Three-tier system: flat page → resting card → hovered card.

| Level | Classes | When |
|---|---|---|
| 0 — Page | `bg-[#EEF2FF]` (no shadow) | Page surface |
| 1 — Resting card | `shadow-[0_2px_8px_rgba(0,0,0,0.07)]` | Cards at rest |
| 2 — Hovered card | `shadow-[0_8px_24px_rgba(79,70,229,0.15)]` | Cards on hover — indigo-tinted shadow |
| 1 — NavBar | `shadow-sm` | Sticky header |
| 2 — Bottom nav | `shadow-lg` | Fixed mobile nav |
| 1 — Controls | `shadow-sm` | Toggle + filter strip |

Shadow on hover uses indigo tint (`rgba(79,70,229,0.15)`) — the shadow color matches the brand, reinforcing identity.

Hero sections use `relative bg-[#4F46E5] pb-16` with an SVG wave (`h-16`) bleeding into the page background. This eliminates the hard edge between hero and content.

---

## Components

### PaikkaKortti (card)

```
motion.div — rounded-2xl, resting shadow → hover shadow (CSS transition)
├── h-1.5 accent bar (sport color, full width)
└── p-5 flex flex-col gap-2.5 flex-1
    ├── badge pill (sport type)
    ├── <Link> card title (hover: text-indigo-600)
    ├── address row (pin icon + text, optional)
    ├── description (line-clamp-2, optional)
    └── mt-auto border-t border-gray-50
        ├── CTA button (left)
        │   ├── varauslinkki → filled "Varaa" (indigo-500, rounded-full)
        │   └── else → outlined "Lue lisää" (border-indigo-200, rounded-full)
        └── price (right, text-lg font-bold, optional)
```

Card hover: `y: -4` lift via Framer Motion + CSS shadow deepening. Shadow transition via CSS (`transition: box-shadow 200ms var(--ease-out)`) to stay off main thread; y-lift via Framer Motion.

### Filter pill

```
motion.button — px-4 py-2 rounded-full text-sm font-semibold
active: bg-[#6366F1] text-white shadow-sm
inactive: bg-white text-[#6B7280] border border-indigo-100 hover:border-indigo-300
whileTap: scale(0.96) duration 100ms
```

### Lista/Kartta toggle

```
Pair of motion.buttons inside bg-white rounded-xl border border-indigo-100 p-1
active: bg-[#6366F1] text-white rounded-lg shadow-sm
inactive: text-gray-500 hover:text-indigo-700
whileTap: scale(0.97) duration 100ms
```

### CTA button (detail page)

```
<a> with buttonVariants() — w-full rounded-full bg-[#6366F1] hover:bg-indigo-600
h-14, text-white font-bold text-base, shadow-lg shadow-indigo-200
active:scale-[0.97]
transition: background-color 150ms var(--ease-out), transform 100ms var(--ease-out)
```

### NavBar

```
sticky top-0 z-40 bg-[#4F46E5] shadow-sm
max-w-5xl mx-auto px-4 h-14 flex items-center justify-between
Logo: text-white font-bold text-lg tracking-tight
Icon right: text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full
```

### BottomNav (mobile)

```
sm:hidden fixed bottom-0 z-50 bg-white border-t border-gray-100 shadow-lg
grid-cols-3 h-16
active tab: text-indigo-600 (filled icon)
inactive tab: text-gray-400 (outline icon)
```

### Search input

```
pl-12 h-12 rounded-full bg-white border-0 text-base shadow-lg
focus-visible:ring-2 focus-visible:ring-indigo-300
Search icon: absolute left-4 top-1/2 -translate-y-1/2 text-gray-400
```

### Hero + wave divider

```tsx
<section className="relative bg-[#4F46E5] pb-16">
  {/* content */}
  <svg className="absolute bottom-0 left-0 w-full h-16"
    viewBox="0 0 1440 64" preserveAspectRatio="none">
    <path d="M0,32 C240,0 480,64 720,32 C960,0 1200,64 1440,32 L1440,64 L0,64 Z"
      fill="#EEF2FF" />
  </svg>
</section>
```

`pb-16` prevents content hiding behind the 64px wave.

### Row (detail page)

```
flex items-start gap-4
└── w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center (icon container)
└── div
    ├── text-xs font-bold text-gray-400 uppercase tracking-wide (label)
    └── content
```

---

## Do's and Don'ts

**Do:**
- Always show name + price + CTA together — never split decision information across pages
- Use the wave SVG on every hero section to maintain page flow
- Keep sport colors in `lib/lajit.ts` — one source of truth
- Use `var(--ease-out)` for all CSS transitions, Framer Motion EASE_OUT for JS animations
- Use `tabular-nums` on all price displays
- Wrap `<BottomNav>` in `<Suspense>` (uses `useSearchParams`)
- Add `pb-16 sm:pb-0` to body for BottomNav clearance

**Don't:**
- Don't substitute other blues for indigo — the palette is tight and intentional
- Don't animate `height: auto` — use opacity + y instead
- Don't use `transition: all` — specify exact properties
- Don't add sport colors inline in components — always use `lajiKonfig`
- Don't use Framer Motion `spring` unless element has direct user drag/cursor tracking
- Don't add `layout` animations — they cause reflow jank
- Don't skip `key` prop on AnimatePresence children
- Don't use shadcn v4 imports (`tw-animate-css`) — project is Tailwind v3
