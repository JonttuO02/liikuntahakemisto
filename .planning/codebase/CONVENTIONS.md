# Coding Conventions

**Analysis Date:** 2026-05-19

## Naming Patterns

**Files:**
- React components: PascalCase matching the exported component name (e.g., `PaikkaKortti.tsx`, `NavBar.tsx`, `BottomNav.tsx`)
- Library/utility files: camelCase (e.g., `lajit.ts`, `supabase.ts`, `utils.ts`)
- Next.js special files: lowercase as required by Next.js App Router (`page.tsx`, `layout.tsx`, `route.ts`)
- UI primitives: lowercase in `components/ui/` (`button.tsx`, `input.tsx`, `badge.tsx`)

**Components:**
- PascalCase for all React component functions (e.g., `PaikkaKortti`, `LiikuntapaikatLista`, `Etusivu`)
- Helper sub-components defined in the same file as their parent, also PascalCase (e.g., `Row`, `LocationIcon`, `HomeIcon` in `app/paikat/[id]/page.tsx` and `BottomNav.tsx`)

**Variables and functions:**
- camelCase for all: `suodatettu`, `paikatKartalla`, `setNakyma`, `hintateksti`, `detectLaji`
- Finnish naming throughout — domain names, state variables, and user-facing strings are in Finnish (`nimi`, `osoite`, `kaupunki`, `aktiivinen`, `valittu`, `nakyma`)
- Constants in UPPER_SNAKE_CASE: `TAMPERE`, `EASE_OUT`, `EASE_DRAWER`, `SCROLL_END`, `NAV_H`, `HAKU_RADIUS_M`, `LAJIT_FILTTERI`, `HINTA_FILTTERI`, `ACTIVE`, `INACTIVE`

**Types:**
- `interface` for object shapes in library code: `LajiKonfig` in `lib/lajit.ts`, `SaaTiedot` in `Etusivu.tsx`, `PlacesResult` in `route.ts`, `ButtonProps` in `button.tsx`
- `type` for union types and simple aliases: `Nakyma = 'lista' | 'kartta'` in `LiikuntapaikatLista.tsx`
- `export type Liikuntapaikka` is defined once as a `type` in `LiikuntapaikatLista.tsx` and imported with `import type` in consuming files
- TypeScript generics used on `Record<string, LajiKonfig>` and for typed arrays like `HINTA_FILTTERI: { label: string; max: number | null }[]`

## TypeScript Patterns

**Strict mode:** `"strict": true` in `tsconfig.json` — all strict checks enforced.

**Explicit return types:** Used on pure helper functions in server/API contexts (`hintateksti(...): string`, `detectLaji(...): string`, `parseOsoite(...): string | null`, `fetchPlaceDetails(...): Promise<...>`). Omitted on React components (inferred).

**Non-null assertions:** Used on Supabase env vars (`process.env.NEXT_PUBLIC_SUPABASE_URL!`) in `lib/supabase.ts`. Avoided elsewhere in favour of nullish coalescing (`?? ''`, `?? []`, `?? {}`).

**Nullish coalescing:** Preferred over `||` for falsy guard: `paikat ?? []`, `process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''`, `lajiKonfig[paikka.laji] ?? { ... }`.

**Type-narrowing with predicate:**
```typescript
// In Etusivu.tsx and Kartta.tsx — type guard for map markers
paikat.filter(
  (p): p is Liikuntapaikka & { latitude: number; longitude: number } =>
    p.latitude != null && p.longitude != null
)
```

**Cubic-bezier as typed tuple:**
```typescript
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]
```
Always typed explicitly to satisfy Framer Motion's `EasingDefinition` constraints.

**`import type`:** Used when importing only a TypeScript type to avoid runtime import: `import type { Liikuntapaikka } from './LiikuntapaikatLista'` and `import type { Metadata } from 'next'`.

## React Patterns

**Server vs. client components:**
- `app/page.tsx`, `app/layout.tsx`, `app/paikat/[id]/page.tsx`, `app/suosikit/page.tsx` are server components — no `'use client'` directive, `async` functions, direct Supabase calls.
- All interactive components have `'use client'` at the very top line: `Etusivu.tsx`, `LiikuntapaikatLista.tsx`, `PaikkaKortti.tsx`, `NavBar.tsx`, `BottomNav.tsx`, `Kartta.tsx`.

**Data flow:** Server pages fetch from Supabase and pass data as props to client components. Client components never call Supabase directly.

**Hooks usage:**
- `useState` with paired setter — state variables use aligned assignment for readability:
  ```typescript
  const [valittu, setValittu]       = useState<Liikuntapaikka | null>(null)
  const [aktiivinen, setAktiivinen] = useState('Kaikki')
  ```
- `useMemo` for all derived/filtered data: `suodatettu`, `paikatKartalla`, `tervehdys`, `saaData`
- `useEffect` for side effects (resize listener, weather fetch)
- `useRef` for DOM access (`scrollRef` in `Etusivu.tsx`)
- `useReducedMotion()` from Framer Motion checked in `PaikkaKortti.tsx` to disable animation for accessibility

**Lazy loading:**
```typescript
const Kartta = lazy(() => import('./Kartta'))
```
Used in `LiikuntapaikatLista.tsx` to code-split the map component. Always wrapped in `<Suspense>` at call site.

**`Suspense` wrapping:**
- `BottomNav` is always wrapped in `<Suspense>` in `app/layout.tsx` because it uses `useSearchParams`
- Page-level server components wrap client children in `<Suspense>`

**Helper sub-components:** Small, purely presentational helpers are defined as named functions in the same file (not exported), below the main component. Examples: `Row`, `LocationIcon`, `PriceIcon`, `InfoIcon` in `app/paikat/[id]/page.tsx`; icon components in `BottomNav.tsx`.

**IIFE in JSX:** Used to compute a value inside JSX that requires a local variable:
```tsx
{(() => {
  const laji = lajiKonfig[valittu.laji] ?? { ... }
  return <span className={laji.badgeTw}>{laji.label}</span>
})()}
```

## Tailwind CSS Usage

**Version:** Tailwind v3 (`@tailwind base/components/utilities` in `globals.css`). Do NOT use v4 import syntax.

**Primary approach:** Utility classes applied directly in JSX `className` props — no CSS Modules, no `@apply`.

**Conditional class strings:** Inline ternary expressions inside template literals:
```typescript
className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-semibold
  ${aktiivinen === laji
    ? 'bg-[#6366F1] text-white shadow-sm'
    : 'bg-gray-100 text-[#6B7280] hover:text-indigo-700 hover:bg-indigo-50'
  }`}
```

**`cn()` helper:** Used from `lib/utils.ts` (clsx + tailwind-merge) only where class merging is needed — mostly in UI primitives (`button.tsx`, `input.tsx`, `badge.tsx`). Application components use plain template literals for conditional classes.

**Arbitrary values:** Used extensively for exact design token values not in the default Tailwind scale:
- Colors: `bg-[#EEF2FF]`, `bg-[#4F46E5]`, `bg-[#6366F1]`, `text-[#1E1B4B]`, `text-[#6B7280]`
- Shadows: `shadow-[0_2px_8px_rgba(0,0,0,0.07)]`, `shadow-[0_8px_24px_rgba(79,70,229,0.15)]`
- Font size: `text-[17px]`, `text-[15px]`, `text-[10px]`

**CSS transitions via arbitrary variant** (not Framer Motion) for hover/focus on CSS properties:
```
[transition:background-color_150ms_var(--ease-out),color_150ms_var(--ease-out)]
```
References the `--ease-out` CSS custom property defined in `globals.css`.

**Scrollbar hiding:**
```
[&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]
```
Applied on horizontally-scrollable pill rows and the main scroll container in `Etusivu.tsx`.

**Responsive prefix:** `sm:` used throughout for mobile-first breakpoints. No `md:` or `lg:` except `lg:grid-cols-3` in the card grid.

**Sport type colors:** Defined exclusively in `lib/lajit.ts` as Tailwind class strings (`badgeTw`, `accentBg`). Never inline sport-specific colors in component files.

## Animation Patterns (Framer Motion)

**Ease curves:** Always defined as typed tuple constants at module level:
```typescript
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]
const EASE_DRAWER: [number, number, number, number] = [0.32, 0.72, 0, 1]
```

**Variant objects:** Named exports for reuse across components:
```typescript
export const korttiVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, ease: EASE_OUT } },
}
```
`gridVariants` is defined locally in `LiikuntapaikatLista.tsx` and uses `staggerChildren: 0.05`.

**`whileTap` only on buttons** — `whileTap={{ scale: 0.95–0.97 }}` with short duration (0.1s). No `whileHover` scale — hover effects handled by CSS transitions off the main thread.

**`whileHover` on cards** — only `y` lift, never scale, respects `useReducedMotion()`:
```typescript
whileHover={reduceMotion ? undefined : { y: -4, transition: { duration: 0.18, ease: EASE_OUT } }}
```

**`AnimatePresence mode="wait"`:** Used in `LiikuntapaikatLista.tsx` for lista/kartta view transitions. Children use opacity-only crossfade (`duration: 0.15`), no y movement.

**Scroll-driven animations** (`useScroll`, `useTransform`, `useMotionValueEvent`): Used in `Etusivu.tsx` to drive map expansion, AI widget fade, and Dynamic Island pill appearance.

**Bottom sheet:** Uses `drag="y"` with `dragElastic` and `onDragEnd` velocity check for dismiss gesture. Entrance uses `initial={{ y: '100%' }}` / `animate={{ y: 0 }}`.

**No `spring` physics** unless direct drag/cursor interaction. No `layout` prop unless absolutely required.

## Import / Export Conventions

**Order (observed pattern):**
1. React built-ins (`'use client'`, then `import { useState } from 'react'`)
2. Third-party libraries (framer-motion, next/link, next/navigation, @react-google-maps/api)
3. Internal aliases (`@/lib/...`, `@/components/ui/...`)
4. Relative imports (`./LiikuntapaikatLista`, `./PaikkaKortti`)

**Path alias:** `@/*` maps to the project root. Used for all cross-directory imports (`@/lib/lajit`, `@/lib/supabase`, `@/components/ui/button`).

**Named exports:** Used for types, constants, and animation variants that are consumed by sibling components (`export type Liikuntapaikka`, `export const korttiVariants`, `export { Button, buttonVariants }`, `export interface LajiKonfig`).

**Default exports:** Used for all React components (`export default function PaikkaKortti`).

**No barrel `index.ts`** files — each module imported directly by path.

## Utility and Library Patterns

**`lib/utils.ts`:** Single `cn()` export — the standard shadcn pattern combining `clsx` and `tailwind-merge`.

**`lib/supabase.ts`:** Single shared `supabase` client exported as named constant. Used in server components and API routes.

**`lib/lajit.ts`:** Single source of truth for sport type config. Exports `LajiKonfig` interface, `lajiKonfig` record (keyed by Finnish sport slug), and `LAJIT_FILTTERI` array. All sport-specific styling must come from here — never inlined.

## shadcn / Base UI Component Usage

**`buttonVariants()`** from `components/ui/button.tsx` is used on `<a>` tags when a link must look like a button (Next.js `Link` or `<a>`), since Base UI does not support `asChild`:
```typescript
className={buttonVariants({ size: 'lg', className: 'w-full rounded-full ...' })}
```

**`Input`** from `components/ui/input.tsx` wraps `@base-ui/react/input`. Used in the search bar in `LiikuntapaikatLista.tsx`.

**`Badge`** from `components/ui/badge.tsx` uses `@base-ui/react/use-render` and `@base-ui/react/merge-props` — note this is NOT the standard shadcn badge. It is not currently used in any application component (badge styling is done inline with Tailwind).

**CVA pattern:** UI primitives use `cva()` from `class-variance-authority` with a `variants` object and `defaultVariants`. Application components do not use CVA — they use plain conditional template literals.

## Error Handling

**API routes (`route.ts`):** Explicit HTTP status codes returned via `NextResponse.json({ error: ... }, { status: N })` for all failure cases (missing env var → 500, network error → 502, denied API key → 403, Supabase error → 500).

**Supabase queries in server components:** Destructure `{ data, error }` and render an inline error message if `error` is truthy. No error boundaries.

**Async fetch in client components:** `.catch(() => {})` — silently ignored (weather fetch in `Etusivu.tsx`). No toast notifications.

**`notFound()`:** Called from `app/paikat/[id]/page.tsx` when id is invalid or the Supabase query returns no row.

## Comments

Comments are used sparingly to explain non-obvious groupings and design decisions:
- Section labels: `/* ── Component ─── */`, `/* ── Map style ─── */` — em-dash ASCII art separators
- Inline rationale for magic values: `// px — matches h-14 NavBar`, `// Stagger 50ms — within skill's 30–80ms window`
- References to design rules: `// Entry: never from scale(0) — start from 0.97 + opacity per skill`

No JSDoc/TSDoc annotations on any function.

---

*Convention analysis: 2026-05-19*
