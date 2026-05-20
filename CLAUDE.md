# Liikuntahakemisto — Project Guide

## GSD Workflow

This project uses the GSD (Get Shit Done) workflow. Planning artifacts live in `.planning/`.

**Current state:** See `.planning/STATE.md` — always check this before starting work.
**Roadmap:** `.planning/ROADMAP.md` — 5 phases, start with Phase 1.
**Requirements:** `.planning/REQUIREMENTS.md` — 19 v1 requirements with REQ-IDs.

**Phase workflow:**
1. `/gsd:discuss-phase N` — gather context
2. `/gsd:plan-phase N` — create PLAN.md
3. `/gsd:execute-phase N` — run the plan
4. `/gsd:verify-work N` — verify against success criteria

**Key constraints from research:**
- Fix Phase 1 (security + schema) before any feature work — critical bugs exist
- URL routing: always use `?nakyma=kartta` (3 competing schemes exist — choose this one)
- GPS: client-side only, never URL params — auto-requests on mount, map centers on user automatically
- AI widget: never SSR, use `/api/saasuositus` Route Handler, non-blocking load
- Supabase writes: service role key only; anon key is read-only after RLS

---

# Liikuntahakemisto — Design Guidelines

## Color System

Primary palette is indigo. Never substitute other blues.

| Token | Tailwind class | Hex | Usage |
|---|---|---|---|
| Background | `bg-indigo-50` | `#EEF2FF` | Page background, wave SVG fill |
| Hero / NavBar | `bg-indigo-600` | `#4F46E5` | Top nav, hero sections |
| Accent | `bg-indigo-500` | `#6366F1` | Active buttons, CTA, active nav tabs |
| Accent hover | `hover:bg-indigo-600` | `#4F46E5` | Button hover state |
| Card background | `bg-white` | `#FFFFFF` | All cards |
| Heading text | `text-indigo-950` | `#1E1B4B` | Card titles |
| Muted text | `text-indigo-300` | `#A5B4FC` | Hero subtitles, addresses in hero |
| Filter active | `bg-indigo-500 text-white` | — | Active laji filter pill |

Sport-type colors (accent bars and badges) are defined in `lib/lajit.ts`. Do not inline sport colors in components.

## Typography

- Font: Inter (`next/font/google`), variable `--font-sans`
- Hero heading: `text-3xl sm:text-4xl font-extrabold text-white leading-tight tracking-tight`
- Card title: `font-bold text-indigo-950 text-[15px] leading-snug`
- Label caps: `text-xs font-bold text-gray-400 uppercase tracking-wide`
- Price: `text-xl font-bold text-indigo-600`

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
rounded-2xl shadow-sm → hover:shadow-xl (transition-shadow duration-300)
├── h-2 accent bar (sport color from lajiKonfig.accentBg)
└── p-5 flex flex-col gap-3
    ├── name + badge row
    ├── address row (optional)
    ├── price (optional, text-indigo-600 font-bold)
    ├── description (line-clamp-2, optional)
    └── CTA button (mt-auto, rounded-full)
        ├── if varauslinkki: filled indigo-600 "Varaa aika →"
        └── else: outlined indigo "Lue lisää →"
```

Cards always `flex flex-col` so the CTA sticks to the bottom with `mt-auto`.

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
