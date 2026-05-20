# Coding Conventions

**Analysis Date:** 2026-05-20

## Naming Patterns

**Files:**
- React components: PascalCase matching the default export (`PaikkaKortti.tsx`, `Etusivu.tsx`, `NavBar.tsx`, `LiikuntapaikatLista.tsx`)
- Library/utility modules: camelCase (`lajit.ts`, `supabase.ts`, `utils.ts`, `mapStyles.ts`)
- Next.js special files: lowercase as required (`page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `not-found.tsx`, `loading.tsx`)
- shadcn UI primitives: lowercase in `components/ui/` (`button.tsx`, `input.tsx`, `badge.tsx`)

**Component functions:**
- Always PascalCase, match the filename exactly
- Small helper sub-components co-located in the same file when used only by one parent: e.g., `Row` in `app/paikat/[id]/page.tsx`
- Helpers defined below the `export default` function, not exported

**Variables and state:**
- Finnish domain vocabulary for data: `paikat`, `paikka`, `nimi`, `laji`, `osoite`, `aktiivinen`, `suodatettu`, `valittu`
- English for React/UI plumbing: `open`, `isLoaded`, `isDark`, `containerW`, `fullH`, `current`
- Boolean state compounding Finnish: `kartaAuki`, `typedDone`
- Constants: SCREAMING_SNAKE_CASE (`TAMPERE`, `NAV_H`, `AUTO_MS`, `CARD_W`, `LAJIT_FILTTERI`)
- Framer Motion easing tuples: `EASE_*` prefix (`EASE_OUT`, `EASE_MAP`, `EASE_DRAWER`)

**Functions:**
- Utility functions: camelCase Finnish verbs for domain logic (`hintateksti`, `detectLaji`, `parseOsoite`, `getInfoWindowStyle`)
- Event handlers: `on` prefix or action verb (`onDragEnd`, `onPreviewMapLoad`, `onFullscreenMapLoad`)
- Animation helpers: descriptive camelCase (`cardAnimate`, `getMarkerIcon`)

## TypeScript Usage

**Strict mode:** `"strict": true` in `tsconfig.json` — all files must satisfy strict TypeScript.

**Type vs interface:**
- `type` for domain data shapes (`Liikuntapaikka` in `lib/types.ts`)
- `interface` for config/record shapes (`LajiKonfig` in `lib/lajit.ts`)
- `interface` for local non-exported API shapes (`SaaTiedot`, `PlacesResult`)

**Type location:**
- `lib/types.ts` — single source of truth for `Liikuntapaikka`
- Config interfaces declared in their own `lib/` file alongside the data
- Internal-only interfaces defined inline above the function that uses them
- Re-exports allowed for convenience: `export type { Liikuntapaikka } from '@/lib/types'`

**Nullability:**
- Database nullable columns: `string | null` (not `undefined`)
- Optional forward-compat additions: `?` operator with a comment:
  ```ts
  // Phase 1 schema additions (DATA-04) — optional for forward compatibility
  hinta_kuvaus?: string | null
  ```
- Runtime fallbacks: `??` (nullish coalescing), never `||` for falsy guards

**Non-null assertions:** Used only on env vars known to be set at runtime:
```ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
```

**Typed easing tuples** (required to satisfy Framer Motion's `EasingDefinition`):
```ts
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1]
```

**Type predicates** for narrowing nullable coordinates:
```ts
paikat.filter(
  (p): p is Liikuntapaikka & { latitude: number; longitude: number } =>
    p.latitude != null && p.longitude != null
)
```

**`import type`:** Used when importing only TypeScript types: `import type { Liikuntapaikka } from '@/lib/types'`, `import type { Metadata } from 'next'`, `import type { LucideIcon } from 'lucide-react'`.

**Explicit return types on helpers:** Used on pure utility functions (`hintateksti(...): string`, `detectLaji(...): string`, `parseOsoite(...): string | null`). Omitted on React components (inferred).

**Path alias:** `@/*` maps to project root. Always use `@/` for cross-directory imports — never `../`.

## Component Conventions

**Server vs. client split:**
- Server components: `app/page.tsx`, `app/paikat/[id]/page.tsx`, `app/suosikit/page.tsx`, `app/layout.tsx` — data fetching only, `async` functions
- Client components: `'use client'` as the very first line — all interactive/animated components
- `app/error.tsx` must be `'use client'` (Next.js requirement)
- Client components never call Supabase directly; server pages fetch and pass data as props

**`'use client'` file structure order:**
1. `'use client'` directive
2. React imports (`useState`, `useEffect`, `useMemo`, etc.)
3. Third-party library imports (framer-motion, next/link, lucide-react, @react-google-maps/api)
4. Internal `@/lib/` imports
5. Internal component imports (`./ComponentName`, `@/components/ui/...`)
6. Module-level constants and easing tuples
7. `export default function ComponentName`

**Props typing:** Inline on the function signature for single-prop components:
```ts
function PaikkaKortti({ paikka }: { paikka: Liikuntapaikka })
```

**Hooks usage pattern** (aligned assignment for readability):
```ts
const [valittu, setValittu]       = useState<Liikuntapaikka | null>(null)
const [aktiivinen, setAktiivinen] = useState('Kaikki')
```

**`useMemo` for derived data:** All filtered/computed lists use `useMemo` with explicit dependency arrays (`suodatettu`, `paikatKartalla`).

**`useCallback` for stable references:** Event handlers passed to child components or used in `useEffect` deps: `onDragEnd`, `resetTimer`, `go`, `onFullscreenMapLoad`, `onPreviewMapLoad`.

**Suspense:** `BottomNav` is wrapped in `<Suspense>` in `app/layout.tsx` because it uses `useSearchParams`. Page-level server components wrap client children in `<Suspense>`.

**IIFE in JSX** for local variable computation inside render:
```tsx
{(() => {
  const laji = lajiKonfig[valittu.laji] ?? { label: valittu.laji, color: '#6b7280' }
  return <span style={{ backgroundColor: laji.color }}>{laji.label}</span>
})()}
```

## Import Organization

**Order (observed pattern):**
1. React and Next.js (`import { useState } from 'react'`, `import Link from 'next/link'`)
2. Third-party libraries (framer-motion, lucide-react, @react-google-maps/api)
3. Internal lib (`@/lib/lajit`, `@/lib/utils`, `@/lib/types`, `@/lib/mapStyles`)
4. Internal components (`./PaikkaKortti`, `@/components/ui/button`)
5. `import type` statements last

**No barrel files:** Each module imported directly by path. No `index.ts` re-export files.

**Default exports:** All React components use `export default function`.

**Named exports:** Types, constants, animation variants shared across files (`export const korttiVariants`, `export type { Liikuntapaikka }`, `export const lajiKonfig`).

## Tailwind Usage

**Version:** Tailwind v3 — `globals.css` uses `@tailwind base/components/utilities` directives. Do NOT use v4 syntax (`@import "tailwindcss"`).

**Glassmorphism utilities** (defined in `app/globals.css` `@layer components`):
- `.glass` — full glass card with backdrop-filter; use on all content cards and containers
- `.glass-hover` — elevated shadow on hover; always paired with `.glass`
- `.glass-nav` — lighter glass for sticky nav/header bars
- `.glass-btn` — small interactive glass for icon buttons and filter pills
- `.glass-dark` — dark-mode glass variant (Karuselli in night mode)

**Color approach:**
- New design system: monochrome `#111111` / `rgba(17,17,17,0.X)` alpha scale for text and borders; white backgrounds
- Legacy indigo palette (`bg-indigo-600`, `text-indigo-950`) still in `error.tsx` — not yet migrated
- Sport colors: always via `lajiKonfig[laji].color` from `lib/lajit.ts`; applied with inline `style={{ backgroundColor: laji.color }}` (not Tailwind arbitrary class) so JIT doesn't need to scan data

**Arbitrary value syntax used extensively:**
- Fine-grained opacity: `text-[rgba(17,17,17,0.45)]`, `border-[rgba(0,0,0,0.12)]`
- Exact pixel sizes: `text-[15px]`, `text-[11px]`, `text-[10px]`
- CSS variable transitions: `[transition:color_150ms_var(--ease-out)]`
- Scrollbar hiding: `[&::-webkit-scrollbar]:hidden [scrollbar-width:none]`

**Conditional classes:** Inline ternary inside template literal:
```tsx
className={`px-3.5 py-2 rounded-full text-sm font-semibold
  ${aktiivinen === laji
    ? 'bg-[#111111] text-white shadow-lg'
    : 'glass-btn text-[rgba(17,17,17,0.7)]'
  }`}
```

**`cn()` helper:** Used from `lib/utils.ts` only in UI primitives (`button.tsx`, `input.tsx`, `badge.tsx`) and `app/layout.tsx`. Application components use plain template literals.

**CSS custom properties** (defined in `globals.css :root`):
- `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` — referenced in CSS transitions
- `--foreground: #111111`, `--background: #ffffff`, `--border: rgba(0,0,0,0.07)`

**Responsive:** Mobile-first. `sm:` for 640px+, `lg:` for 3-column card grid.

## Animation Patterns (Framer Motion)

**Easing constants** per file (each component declares its own needed constants):
```tsx
const EASE_OUT:   [number, number, number, number] = [0.23, 1, 0.32, 1]
const EASE_DRAWER:[number, number, number, number] = [0.32, 0.72, 0, 1]
const EASE_MAP:   [number, number, number, number] = [0.4, 0, 0.2, 1]
```

**Card stagger grid:**
```tsx
const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
}
// korttiVariants exported from PaikkaKortti.tsx for reuse in empty-state
export const korttiVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT } },
}
```

**Card hover:** y-lift only, never scale+y combined:
```tsx
whileHover={{ y: -2, transition: { duration: 0.18, ease: EASE_OUT } }}
```

**Tap feedback:** `whileTap={{ scale: 0.97 }}` on primary buttons; `whileTap={{ scale: 0.95 }}` on filter pills; `whileTap={{ scale: 0.88 }}` on icon buttons.

**No `whileHover` scale** on filter buttons — it conflicts with text layout.

**`AnimatePresence`:**
- Always `mode="wait"` for icon swaps (hamburger/X, Sun/Moon)
- Always stable `key` prop on direct child
- `initial={false}` when element should not animate on mount

**View transitions:** Pure opacity crossfade — no y-movement:
```tsx
initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
transition={{ duration: 0.12 }}
```

**Bottom sheet dismiss:**
```tsx
drag="y"
dragConstraints={{ top: 0, bottom: 0 }}
dragElastic={{ top: 0, bottom: 0.4 }}
onDragEnd={(_, info) => {
  if (info.velocity.y > 300 || info.offset.y > 80) setValittu(null)
}}
```

**Carousel drag:** `drag="x"` with `dragElastic={0.12}`, advance on `offset.x > 40` or `velocity.x > 300`.

**No `spring` physics** unless direct drag/cursor tracking. No `layout` animations unless required.

## Finnish Language in UI

All user-facing text is Finnish. This is required — do not use English strings in UI.

**UI vocabulary:**
- Navigation: "Koti", "Lista", "Suosikit"
- Actions: "Varaa →", "Näytä tiedot", "Yritä uudelleen", "Palaa etusivulle", "Takaisin hakemistoon"
- Empty states: "Ei tuloksia", "Tyhjennä haku", "Lisätään pian"
- Error: "Jotain meni pieleen.", "Sivua ei löydy."
- Placeholders: "Hae liikuntapaikkaa..."

**API error messages:** Finnish for domain-specific errors; English only for generic HTTP errors (`'Unauthorized'`, `'Server configuration error'`).

**Database field names:** Finnish (`nimi`, `laji`, `osoite`, `kaupunki`, `varauslinkki`, `kuvaus`, `puhelin`).

## Error Handling

**Server components:** Destructure `{ data, error }` from every Supabase call; render inline error on truthy `error`. Call `notFound()` for missing records.

**Route handlers:** All failure cases return `NextResponse.json({ error: '...' }, { status: N })`. Auth guard pattern:
```ts
if (!process.env.ADMIN_SECRET) {
  return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
}
if (req.headers.get('authorization') !== `Bearer ${process.env.ADMIN_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**External fetches:** Wrap in `try/catch`; return appropriate status on network failure. Non-critical client fetches (weather): `.catch(() => {})` silent ignore.

## Module Design

**`lib/` responsibilities:**
- `lib/types.ts` — `Liikuntapaikka` type only
- `lib/lajit.ts` — `lajiKonfig`, `LAJIT_FILTTERI`, `getInfoWindowStyle`
- `lib/supabase.ts` — `supabase` (anon), `supabaseAdmin` (service role, server-only)
- `lib/utils.ts` — `cn()`, `hintateksti()`
- `lib/mapStyles.ts` — `DAY_MAP_STYLES`, `NIGHT_MAP_STYLES`, `isNightHour`

**`supabaseAdmin` rule:** Only in server-side files (route handlers, server components). Comment on the export enforces this: `// Server-only admin client — bypasses RLS. NEVER import in client components.`

**shadcn components (`components/ui/`):** `button.tsx`, `input.tsx`, `badge.tsx`. Use `buttonVariants()` on `<a>` tags for link-as-button (`asChild` unavailable with Base UI).

## Comments

**When to comment:**
- Security constraints: `// Server-only admin client — bypasses RLS. NEVER import in client components.`
- Phase annotations: `// Phase 1 schema additions (DATA-04) — optional for forward compatibility`
- Non-obvious rendering choices: `// clip-path clips at render level — the only reliable way to round Google Maps corners`
- Section separators in long components: `{/* ── Section name ─────────── */}` or `/* ── Section ─── */`

**No JSDoc/TSDoc** on any function — TypeScript types serve as documentation.

---

*Convention analysis: 2026-05-20*
