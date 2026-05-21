# Liikuntahakemisto — Project Guide

## GSD Workflow

This project uses the GSD (Get Shit Done) workflow. Planning artifacts live in `.planning/`.

**Current state:** See `.planning/STATE.md` — always check this before starting work.
**Roadmap:** `.planning/ROADMAP.md` — Phases 6–11 (v1.1 active milestone).
**Requirements:** `.planning/REQUIREMENTS.md` — 19 v1.1 requirements with REQ-IDs.

**Phase workflow:**
1. `/gsd:discuss-phase N` — gather context
2. `/gsd:plan-phase N` — create PLAN.md
3. `/gsd:execute-phase N` — run the plan
4. `/gsd:verify-work N` — verify against success criteria

**Key constraints (v1.0 shipped, v1.1 active):**
- URL routing: always use `?nakyma=kartta` (3 competing schemes exist — choose this one)
- GPS: client-side only, never URL params — auto-requests on mount, map centers on user automatically
- AI widget: never SSR, use `/api/saasuositus` Route Handler, non-blocking load
- Supabase writes: service role key only; anon key is read-only after RLS
- LEGAL-01 must be live (Phase 6) before auth (Phase 9) ships
- AdvancedMarker migration is a Phase 7 prerequisite — no new map features before it

---

# Liikuntahakemisto — Design Guidelines

## Color System

The project uses a custom glassmorphism design system. Primary visual primitives are the `.glass`, `.glass-hover`, `.glass-btn`, and `.glass-nav` utility classes defined in `app/globals.css` — always use these, never replicate them inline.

| Role | Value | Tailwind / class | Usage |
|---|---|---|---|
| Page background | `#ffffff` | `bg-white` | Page backgrounds, card backgrounds |
| Card / widget surface | `rgba(255,255,255,0.60–0.95)` | `.glass` | PaikkaKortti, AI widget, profile content card |
| Foreground primary | `#111111` | `text-[#111111]` | Headings, active buttons, CTA labels |
| Foreground muted | `rgba(17,17,17,0.45)` | `text-[rgba(17,17,17,0.45)]` | Addresses, subtitles, secondary text |
| Foreground disabled | `rgba(17,17,17,0.35)` | `text-[rgba(17,17,17,0.35)]` | "Lisätään pian" placeholders |
| Accent — interactive | `#111111` | `bg-[#111111]` | Active filter pills, primary CTA buttons, active nav states |
| Accent hover | `#333333` | `hover:bg-[#333333]` | Button hover state |
| Border default | `rgba(0,0,0,0.07)` | `border-[rgba(0,0,0,0.07)]` | Card separators, container borders |
| Border interactive | `rgba(0,0,0,0.12)` | `border-[rgba(0,0,0,0.12)]` | Input fields, outlined buttons |
| Open status | `#16a34a` | `bg-green-500 text-green-700` | "Auki nyt" indicator dot + text |
| Sponsored badge | `#fef3c7` / `#b45309` | `bg-amber-100 text-amber-700 border-amber-200` | "Sponsoroitu" badge — the only amber in the project |
| Destructive | `#dc2626` | `text-red-600` | Destructive actions |

**NavBar and hero sections** still use the legacy indigo palette from v1.0 (`bg-indigo-600`, `bg-indigo-800`) — these are not part of the glassmorphism system and should not be changed outside a dedicated nav redesign phase.

Sport-type colors (accent bars and badges) are defined in `lib/lajit.ts`. Do not inline sport colors in components.

## Typography

- Font: Inter (`next/font/google`), variable `--font-sans`; `font-serif` (system serif) for display headings and profile price — existing pattern, do not replace
- **4 sizes only** — never declare more than 4 distinct font sizes in a phase:
  - Micro / badge: `text-[10px] font-bold` — sport pill, Sponsoroitu badge, caps labels
  - Body / UI label: `text-sm font-bold` or `text-sm` (400) — card names, descriptions, addresses, price values
  - Subheading / profile price: `text-xl font-bold`
  - Display heading: `text-3xl sm:text-4xl font-bold font-serif`
- **2 weights only**: 400 (normal) and 700 (bold). Never use 600 (semibold).
- Hero heading: `text-3xl sm:text-4xl font-bold text-white leading-tight tracking-tight`
- Card title: `font-bold text-[#111111] text-sm`
- Label caps: `text-[10px] font-bold text-[#111111] uppercase tracking-widest`
- Price (card): `text-sm font-bold text-[#111111] tabular-nums`
- Price (profile): `text-xl font-bold text-[#111111]`

## Animation Principles (Emil Kowalski style)

Keep animations fast, purposeful, and physically grounded. Never animate for decoration.

### Durations
- Hover transitions: `duration: 0.18`, ease `"easeOut"` — snappy, instant feedback
- Card enter: `duration: 0.35`, ease `[0.25, 0.1, 0.25, 1]` — natural deceleration
- View transitions (AnimatePresence): `duration: 0.2`, opacity only — no layout shift
- Hero enter: `duration: 0.5`, ease `[0.25, 0.1, 0.25, 1]`

### Stagger
Card grid stagger: `staggerChildren: 0.06` on the container (`gridVariants`). Keep stagger ≤ 0.08s — anything longer feels sluggish.

### Card hover
```tsx
whileHover={{ scale: 1.02, transition: { duration: 0.18, ease: 'easeOut' } }}
```
Use scale only — never combine with y-lift. Pick one physical metaphor.

### View transitions
Wrap lista/kartta with `<AnimatePresence mode="wait">`. Each child gets `initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}` — no y-movement, pure crossfade.

### Filter buttons
`whileTap={{ scale: 0.95 }}` only. No hover scale — it conflicts with the text layout.

### Rules
- No `spring` physics unless the element has direct user drag/cursor tracking.
- No `layout` animations unless absolutely required — they cause reflow jank.
- `AnimatePresence` always needs a stable `key` prop on the child.
- Avoid animating `height: auto` — use opacity + y instead.

## Card Structure (PaikkaKortti)

```
.glass rounded-2xl (glassmorphism surface)
└── p-4 flex flex-col gap-3
    ├── badge row: [sport pill] [Sponsoroitu?] [Kertakäynti OK?]
    ├── venue name link (text-sm font-bold text-[#111111])
    ├── open status indicator
    ├── price row (text-sm font-bold text-[#111111] tabular-nums)
    │   └── "vain jäsenyys" if hinta_kuvaus contains "jäsenyys" (muted, not bold)
    ├── address row (optional)
    ├── description (line-clamp-2, optional)
    └── bottom row (mt-auto)
        ├── CTA: outlined "Näytä tiedot" (border-[rgba(0,0,0,0.12)], rounded-full)
        └── distance string (right side, if available)
```

Cards always `flex flex-col` so the CTA sticks to the bottom with `mt-auto`. "Varaa aika" button is not shown on list cards — booking URL appears as plain text on the profile page only.

## Hero + Wave Divider

Every hero section (listing page and profile page) uses this pattern:

```tsx
<section className="relative bg-indigo-600 pb-16">
  {/* content */}
  <svg className="absolute bottom-0 left-0 w-full h-16"
    viewBox="0 0 1440 64" preserveAspectRatio="none">
    <path d="M0,32 C240,0 480,64 720,32 C960,0 1200,64 1440,32 L1440,64 L0,64 Z"
      fill="#EEF2FF" />
  </svg>
</section>
```

`pb-16` on the section prevents content from hiding behind the 64px tall wave. The wave fill always matches the next section's background (`#EEF2FF` = indigo-50).

## Navigation

### NavBar (`app/components/NavBar.tsx`)
- `sticky top-0 z-40 bg-indigo-800`
- Logo: text link to `/`
- Desktop-only (hidden on mobile where BottomNav takes over — but NavBar is actually visible on all sizes in this project, BottomNav is `sm:hidden`)

### BottomNav (`app/components/BottomNav.tsx`)
- `fixed bottom-0 sm:hidden` — mobile only
- Three tabs: **Koti** (`/`), **Kartta** (`/?nakyma=kartta`), **Suosikit** (`/suosikit`)
- Active tab: `text-indigo-600`, inactive: `text-gray-400`
- Body needs `pb-16 sm:pb-0` to clear the nav (set in `app/layout.tsx`)
- Must be wrapped in `<Suspense>` in layout because it uses `useSearchParams`

### View toggle (lista/kartta)
State lives in the URL: `?nakyma=kartta` for map, no param for list. Use `useSearchParams` + `useRouter` to read/write. This allows the BottomNav Kartta tab to deep-link directly to map view.

## Component Conventions

- Server components: data fetching in `app/page.tsx` and `app/paikat/[id]/page.tsx`
- Client components: `'use client'` at top, animations and interactivity
- `lib/lajit.ts` is the single source of truth for sport labels and colors
- `lib/supabase.ts` exports a shared `supabase` client
- Use `buttonVariants()` from `components/ui/button.tsx` on `<a>` tags when you need a link that looks like a button (shadcn Base UI doesn't support `asChild`)
- Kartta component is lazy-loaded: `const Kartta = lazy(() => import('./Kartta'))`

## Tailwind Notes

This project uses **Tailwind v3** (not v4). `globals.css` uses `@tailwind base/components/utilities` directives, not `@import "tailwindcss"`. Do not add shadcn v4 imports (`tw-animate-css`, `shadcn/tailwind.css`) — they are incompatible.

## Environment Variables

| Variable | Side | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Supabase anon key |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | client | Maps JS API (HTTP referrer restrictions OK) |
| `GOOGLE_PLACES_API_KEY` | server only | Places API (no referrer restrictions — server calls have no Referer header) |
