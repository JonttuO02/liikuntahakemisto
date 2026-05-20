# Phase 1: Foundation & Security - Pattern Map

**Mapped:** 2026-05-19
**Files analyzed:** 12 new/modified files
**Analogs found:** 11 / 12 (1 file has no close analog — SQL migrations)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `lib/types.ts` | model/type | — | `app/components/LiikuntapaikatLista.tsx` lines 12–25 | exact (source of truth) |
| `lib/utils.ts` | utility | transform | `app/components/PaikkaKortti.tsx` lines 22–27 | exact (duplicate to consolidate) |
| `lib/lajit.ts` | utility/config | transform | self (add function to existing file) | self |
| `lib/supabase.ts` | config/client | request-response | self (extend existing file) | self |
| `app/loading.tsx` | component | — | `app/components/Etusivu.tsx` lines 174–180 (skeleton pulse pattern) | partial |
| `app/error.tsx` | component | event-driven | `app/components/LiikuntapaikatLista.tsx` (Framer Motion + indigo brand) | role-match |
| `app/api/admin/sync-paikat/route.ts` | route/handler | request-response | `app/api/hae-paikat/route.ts` | exact |
| `app/page.tsx` | route/page | request-response | self (targeted edit) | self |
| `app/components/BottomNav.tsx` | component | event-driven | self (targeted edit) | self |
| `app/components/LiikuntapaikatLista.tsx` | component | — | self (re-export, targeted edit) | self |
| `app/components/Kartta.tsx` | component | request-response | self + `lib/lajit.ts` | self |
| `app/components/PaikkaKortti.tsx` | component | transform | self (import update only) | self |
| `app/components/Etusivu.tsx` | component | transform | self (import update only) | self |
| `app/paikat/[id]/page.tsx` | route/page | request-response | self (import update only) | self |
| `supabase/migrations/*.sql` | migration | batch | no analog | none |
| `package.json` | config | — | self (remove entries) | self |

---

## Pattern Assignments

### `lib/types.ts` (new — model/type)

**Analog:** `app/components/LiikuntapaikatLista.tsx` lines 12–25

Extract the `Liikuntapaikka` type verbatim from the source and add the 4 new Phase 1 columns as optional fields. No imports needed — pure type definitions file.

**Type to extract** (`app/components/LiikuntapaikatLista.tsx` lines 12–25):
```typescript
export type Liikuntapaikka = {
  id: number
  nimi: string
  laji: string
  osoite: string | null
  kaupunki: string | null
  latitude: number | null
  longitude: number | null
  hinta_min: number | null
  hinta_max: number | null
  varauslinkki: string | null
  kuvaus: string | null
  puhelin: string | null
}
```

**Add these 4 optional fields** (DATA-04 forward-compatibility, per D-13):
```typescript
  hinta_kuvaus?: string | null
  aukioloajat?: Record<string, { open: string; close: string }> | null
  lajit_lista?: string[] | null
  featured?: boolean | null
```

**File structure:**
```typescript
// lib/types.ts
// Single source of truth for shared TypeScript types

export type Liikuntapaikka = {
  // ... all fields above including 4 new optional ones
}
```

---

### `lib/utils.ts` (modify — add `hintateksti`)

**Analog:** `app/components/PaikkaKortti.tsx` lines 22–27 (canonical source — identical in all 3 locations)

**Existing file** (`lib/utils.ts` lines 1–6):
```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Add after `cn()`** — copy verbatim from `app/components/PaikkaKortti.tsx` lines 22–27:
```typescript
export function hintateksti(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min}–${max} €`
  if (min != null) return `alkaen ${min} €`
  if (max != null) return `max ${max} €`
  return ''
}
```

**Note:** The function body is identical across all 3 locations (`PaikkaKortti.tsx:22–27`, `Etusivu.tsx:42–47`, `paikat/[id]/page.tsx:7–12`). Use the PaikkaKortti version as canonical.

---

### `lib/lajit.ts` (modify — add `getInfoWindowStyle`)

**Analog:** Self — add after the existing `lajiKonfig` map (currently ends at line 18).

**Existing file structure** (`lib/lajit.ts` lines 1–18) — read-only reference:
```typescript
export interface LajiKonfig {
  label: string
  badgeTw: string
  accentBg: string
}

export const lajiKonfig: Record<string, LajiKonfig> = {
  padel:         { label: 'Padel',         badgeTw: 'bg-blue-100 text-blue-700',    accentBg: 'bg-blue-500' },
  tennis:        { label: 'Tennis',        badgeTw: 'bg-green-100 text-green-700',  accentBg: 'bg-green-500' },
  jooga:         { label: 'Jooga',         badgeTw: 'bg-purple-100 text-purple-700', accentBg: 'bg-purple-500' },
  kuntosali:     { label: 'Kuntosali',     badgeTw: 'bg-orange-100 text-orange-700', accentBg: 'bg-orange-500' },
  uinti:         { label: 'Uinti',         badgeTw: 'bg-cyan-100 text-cyan-700',    accentBg: 'bg-cyan-500' },
  liikuntahalli: { label: 'Liikuntahalli', badgeTw: 'bg-indigo-100 text-indigo-700', accentBg: 'bg-indigo-500' },
  liikunta:      { label: 'Liikunta',      badgeTw: 'bg-gray-100 text-gray-600',    accentBg: 'bg-gray-400' },
}
```

**Add after `lajiKonfig`** — hex values derived from the Tailwind class colors already in `badgeTw`:
```typescript
// Used by Kartta.tsx InfoWindow (renders outside React DOM — no Tailwind classes)
export function getInfoWindowStyle(laji: string): { background: string; color: string } {
  const styles: Record<string, { background: string; color: string }> = {
    padel:         { background: '#dbeafe', color: '#1d4ed8' },
    tennis:        { background: '#dcfce7', color: '#15803d' },
    jooga:         { background: '#f3e8ff', color: '#7e22ce' },
    kuntosali:     { background: '#ffedd5', color: '#c2410c' },
    uinti:         { background: '#cffafe', color: '#0e7490' },
    liikuntahalli: { background: '#e0e7ff', color: '#3730a3' },
    liikunta:      { background: '#f3f4f6', color: '#374151' },
  }
  return styles[laji] ?? { background: '#f3f4f6', color: '#374151' }
}
```

**Gotcha:** The values in `styles` match the semantic color of `badgeTw` (e.g. `bg-blue-100` → `#dbeafe`, `text-blue-700` → `#1d4ed8`). The `lajiVari` record in `Kartta.tsx` lines 9–15 is the OLD version to DELETE — the values here should supersede it.

---

### `lib/supabase.ts` (modify — add `supabaseAdmin`)

**Analog:** Self — extend the existing 6-line file.

**Current file** (`lib/supabase.ts` lines 1–6):
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**Add after `supabase` export** — same `createClient` call pattern, different key:
```typescript
// Server-only admin client — bypasses RLS. NEVER import in client components.
// Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (no NEXT_PUBLIC_ prefix).
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

**Guard pattern from RESEARCH.md** — add before the `supabaseAdmin` export if SUPABASE_SERVICE_ROLE_KEY is critical-path:
```typescript
if (!process.env.SUPABASE_SERVICE_ROLE_KEY && typeof window === 'undefined') {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not set — admin writes will fail')
}
```

---

### `app/loading.tsx` (new — component, no data flow)

**Analog:** `app/components/Etusivu.tsx` lines 174–180 (skeleton pulse pattern), `app/components/PaikkaKortti.tsx` (card dimensions to mirror)

**Skeleton pulse pattern from Etusivu** (`Etusivu.tsx` lines 174–180):
```tsx
<div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
<div className="w-14 h-9 bg-gray-100 rounded-lg animate-pulse" />
<div className="w-44 h-4 bg-gray-100 rounded-full animate-pulse" />
```

**PaikkaKortti card structure to mirror** (from `PaikkaKortti.tsx`):
- `rounded-2xl` card wrapper
- `h-2 w-full` accent bar at top
- `p-5` content area with badge, title, address, price rows

**Full skeleton structure** — no `'use client'` directive, no imports needed:
```tsx
// app/loading.tsx — NO 'use client'
export default function Loading() {
  return (
    <div className="min-h-screen bg-indigo-50">
      {/* Skeleton hero */}
      <div className="bg-indigo-600 pb-16 relative">
        <div className="max-w-5xl mx-auto px-4 pt-10 pb-6 sm:pt-14 sm:pb-8">
          <div className="h-10 w-48 bg-indigo-500/50 rounded animate-pulse" />
          <div className="mt-2 h-4 w-32 bg-indigo-500/40 rounded animate-pulse" />
          <div className="mt-5 h-12 max-w-lg bg-indigo-500/40 rounded-full animate-pulse" />
        </div>
        <div className="absolute bottom-0 left-0 w-full h-16 bg-indigo-50" style={{ clipPath: 'ellipse(55% 100% at 50% 100%)' }} />
      </div>

      {/* Skeleton grid — 6 cards, same grid as real content */}
      <div className="max-w-5xl mx-auto px-4 pt-9 pb-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              {/* Accent bar */}
              <div className="h-2 w-full bg-gray-200 animate-pulse" />
              <div className="p-5 flex flex-col gap-3">
                {/* Badge */}
                <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
                {/* Title */}
                <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
                {/* Address */}
                <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
                {/* Price + CTA row */}
                <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
                  <div className="h-8 w-24 bg-gray-200 rounded-full animate-pulse" />
                  <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

---

### `app/error.tsx` (new — component, event-driven)

**Analog:** `app/components/LiikuntapaikatLista.tsx` (Framer Motion animation pattern, indigo brand classes)

**Animation pattern from LiikuntapaikatLista** (`LiikuntapaikatLista.tsx` lines 88–91):
```tsx
<motion.div
  initial={{ opacity: 0, y: 14, scale: 0.99 }}
  animate={{ opacity: 1, y: 0, scale: 1 }}
  transition={{ duration: 0.45, ease: EASE_OUT }}
>
```

**CLAUDE.md card enter spec:** `duration: 0.35`, ease `[0.25, 0.1, 0.25, 1]`, opacity + small y only.

**Button pattern from PaikkaKortti** (`PaikkaKortti.tsx` lines 89–91):
```tsx
className="bg-[#6366F1] hover:bg-indigo-600 text-white text-sm font-semibold py-2 px-5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
```

**Outlined link pattern from PaikkaKortti** (`PaikkaKortti.tsx` lines 96–99):
```tsx
className="border border-indigo-200 text-indigo-600 hover:bg-indigo-50 text-sm font-medium py-2 px-5 rounded-full [transition:background-color_150ms_var(--ease-out),border-color_150ms_var(--ease-out)]"
```

**Full error boundary structure** — must have `'use client'`:
```tsx
'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center px-4 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="text-center max-w-sm"
      >
        <p className="text-5xl mb-4 select-none">⚠️</p>
        <h1 className="text-2xl font-bold text-indigo-950 mb-2">Jotain meni pieleen.</h1>
        <p className="text-gray-500 mb-8">Yritä uudelleen tai palaa etusivulle.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-[#6366F1] hover:bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
          >
            Yritä uudelleen
          </button>
          <Link
            href="/"
            className="border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-medium px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
          >
            Palaa etusivulle
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
```

---

### `app/api/admin/sync-paikat/route.ts` (new — route/handler, request-response)

**Analog:** `app/api/hae-paikat/route.ts` (exact copy, with auth guard added and client swapped)

**Imports pattern** (`app/api/hae-paikat/route.ts` lines 1–3):
```typescript
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
```
**Change:** Replace `supabase` import with `supabaseAdmin` from `@/lib/supabase`.

**Auth guard pattern** — add as FIRST statement inside `GET()` (before the `API_KEY` check at current line 58):
```typescript
export async function GET(req: Request) {
  // Auth guard — must be first, before any processing
  if (!process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... rest of handler from hae-paikat/route.ts
```

**Upsert swap** (`app/api/hae-paikat/route.ts` lines 131–134) — change `supabase` to `supabaseAdmin`:
```typescript
// OLD (anon client — will fail after RLS enabled):
const { data: tallennettu, error } = await supabase
  .from('liikuntapaikat')
  .upsert(rivit, { onConflict: 'place_id', ignoreDuplicates: false })
  .select('id')

// NEW (admin client — bypasses RLS):
const { data: tallennettu, error } = await supabaseAdmin
  .from('liikuntapaikat')
  .upsert(rivit, { onConflict: 'place_id', ignoreDuplicates: false })
  .select('id')
```

**Error response pattern** (`app/api/hae-paikat/route.ts` lines 136–140):
```typescript
if (error) {
  return NextResponse.json(
    { error: `Supabase-virhe: ${error.message}` },
    { status: 500 }
  )
}
```

**Core handler structure is identical** to `hae-paikat/route.ts` lines 57–148. Copy the entire file, then:
1. Add `supabaseAdmin` to the import on line 2
2. Insert auth guard as first 5 lines of `GET()`
3. Swap `supabase` → `supabaseAdmin` on the upsert line (131)

---

### `app/api/hae-paikat/route.ts` (modify — add auth guard only)

**Analog:** Self — add auth guard from the admin route pattern as first statement in the existing `GET()`.

**Current `GET()` signature** (`app/api/hae-paikat/route.ts` line 57):
```typescript
export async function GET() {
```

**Change to** (add `req: Request` param and insert auth guard):
```typescript
export async function GET(req: Request) {
  if (!process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!API_KEY) { // existing check — unchanged
```

**Also swap** upsert on line 131 from `supabase` to `supabaseAdmin` (needed after RLS is enabled).

---

### `app/page.tsx` (modify — fix searchParams routing)

**Analog:** Self — targeted edit.

**Current broken pattern** (`app/page.tsx` lines 6–9, 26):
```typescript
} {
  searchParams: { view?: string; map?: string }
}) {
  // ...
  if (searchParams.view === 'lista') {
```

**Replace with** (canonical `nakyma` param, D-04/D-05):
```typescript
} {
  searchParams: { nakyma?: string }
}) {
  // ...
  if (searchParams.nakyma === 'lista' || searchParams.nakyma === 'kartta') {
    return (
      <Suspense>
        <LiikuntapaikatLista paikat={data} />
      </Suspense>
    )
  }
  return (
    <Suspense>
      <Etusivu paikat={data} />
    </Suspense>
  )
```

**Data fetch** (`app/page.tsx` lines 11–14) — unchanged:
```typescript
const { data: paikat, error } = await supabase
  .from('liikuntapaikat')
  .select('id, nimi, laji, osoite, kaupunki, latitude, longitude, hinta_min, hinta_max, varauslinkki, kuvaus, puhelin')
  .order('nimi')
```

---

### `app/components/BottomNav.tsx` (modify — fix URL params and active state)

**Analog:** Self — targeted edit.

**Current broken vars and logic** (`BottomNav.tsx` lines 65–70):
```typescript
const view = searchParams.get('view')   // DELETE
const map  = searchParams.get('map')    // DELETE

const isKoti   = pathname === '/' && !view && !map
const isKartta = pathname === '/' && map === '1'
const isLista  = pathname === '/' && view === 'lista'
```

**Replace with** (single `nakyma` param):
```typescript
const nakyma = searchParams.get('nakyma')

const isKoti     = pathname === '/' && !nakyma
const isKartta   = pathname === '/' && nakyma === 'kartta'
const isLista    = pathname === '/' && nakyma === 'lista'
const isSuosikit = pathname === '/suosikit'
```

**Current broken hrefs** (`BottomNav.tsx` lines 86, 94):
```tsx
href="/?map=1"      // line 86 — DELETE
href="/?view=lista" // line 94 — DELETE
```

**Replace with:**
```tsx
href="/?nakyma=kartta"  // Kartta tab
href="/?nakyma=lista"   // Lista tab
```

**No change needed:** `usePathname`, `useSearchParams` imports (line 4), component structure, icon components, Suspense wrapper in `layout.tsx`.

---

### `app/components/LiikuntapaikatLista.tsx` (modify — re-export type)

**Analog:** Self — replace type definition with re-export.

**Current type definition** (`LiikuntapaikatLista.tsx` lines 12–25) — DELETE this block:
```typescript
export type Liikuntapaikka = {
  id: number
  // ... 11 fields
}
```

**Replace with single re-export line:**
```typescript
export type { Liikuntapaikka } from '@/lib/types'
```

**Preserves:** All existing imports from `./LiikuntapaikatLista` in Kartta, PaikkaKortti, Etusivu continue working unchanged — re-export is a non-breaking change.

**No other changes** to this file — the `useSearchParams()` call already uses `?nakyma` (line 50), which is correct.

---

### `app/components/Kartta.tsx` (modify — fix lajiVari, fix type import)

**Analog:** Self + `lib/lajit.ts` (getInfoWindowStyle).

**Remove** `lajiVari` record (`Kartta.tsx` lines 9–15):
```typescript
// DELETE THIS ENTIRE BLOCK:
const lajiVari: Record<string, { bg: string; color: string }> = {
  padel:     { bg: '#dbeafe', color: '#1d4ed8' },
  tennis:    { bg: '#dcfce7', color: '#15803d' },
  jooga:     { bg: '#f3e8ff', color: '#7e22ce' },
  kuntosali: { bg: '#ffedd5', color: '#c2410c' },
  uinti:     { bg: '#cffafe', color: '#0e7490' },
}
```

**Update imports** (`Kartta.tsx` lines 1–5):
```typescript
// Change line 5 from:
import type { Liikuntapaikka } from './LiikuntapaikatLista'
// To:
import type { Liikuntapaikka } from '@/lib/types'

// Add to imports:
import { getInfoWindowStyle } from '@/lib/lajit'
```

**Update InfoWindow badge** (`Kartta.tsx` lines 79–80) — replace `lajiVari` usage:
```typescript
// OLD:
background: lajiVari[valittu.laji]?.bg ?? '#f3f4f6',
color: lajiVari[valittu.laji]?.color ?? '#374151',

// NEW:
...getInfoWindowStyle(valittu.laji),
```

Or equivalently (destructure for clarity):
```typescript
const { background, color } = getInfoWindowStyle(valittu.laji)
// then use background and color in the style prop
```

---

### `app/components/PaikkaKortti.tsx` (modify — import updates only)

**Analog:** Self — two import line changes, no logic changes.

**Change line 6** — type import:
```typescript
// FROM:
import type { Liikuntapaikka } from './LiikuntapaikatLista'
// TO:
import type { Liikuntapaikka } from '@/lib/types'
```

**Change `hintateksti` function** (lines 22–27) — replace local definition with import:
```typescript
// DELETE lines 22–27:
function hintateksti(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min}–${max} €`
  if (min != null) return `alkaen ${min} €`
  if (max != null) return `max ${max} €`
  return ''
}

// ADD to imports at top of file:
import { hintateksti } from '@/lib/utils'
```

**All other lines unchanged.**

---

### `app/components/Etusivu.tsx` (modify — import updates only)

**Analog:** Self — two import line changes, no logic changes.

**Change line 11** — type import:
```typescript
// FROM:
import type { Liikuntapaikka } from './LiikuntapaikatLista'
// TO:
import type { Liikuntapaikka } from '@/lib/types'
```

**Remove local `hintateksti` function** (lines 42–47 in current file):
```typescript
// DELETE:
function hintateksti(min: number | null, max: number | null) {
  if (min != null && max != null) return `${min}–${max} €`
  if (min != null)                return `alkaen ${min} €`
  if (max != null)                return `max ${max} €`
  return ''
}
```

**Add to imports block** (around line 10):
```typescript
import { hintateksti } from '@/lib/utils'
```

**All other lines unchanged** — `hintateksti` calls at lines 366–367 stay as-is.

---

### `app/paikat/[id]/page.tsx` (modify — import update only)

**Analog:** Self — one import addition, one local function deletion.

**Remove local `hintateksti` function** (`paikat/[id]/page.tsx` lines 7–12):
```typescript
// DELETE:
function hintateksti(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min}–${max} €`
  if (min != null) return `alkaen ${min} €`
  if (max != null) return `max ${max} €`
  return ''
}
```

**Add to imports** (insert after existing imports at lines 1–5):
```typescript
import { hintateksti } from '@/lib/utils'
```

**Note:** This file uses `select('*')` and accesses fields directly — no `Liikuntapaikka` type import needed. No change for D-07.

---

### `supabase/migrations/20260519000000_add_phase1_columns.sql` (new — migration)

**Analog:** None — no existing migration files in the codebase.

**Use ready-to-run SQL from RESEARCH.md** (verbatim, verified idempotent):
```sql
-- Migration: add Phase 1 columns to liikuntapaikat
-- Phase 1: Foundation & Security (DATA-04, ADS-01)
-- Date: 2026-05-19

ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS hinta_kuvaus text;

ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS aukioloajat jsonb;

ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS lajit_lista jsonb;

ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
```

---

### `supabase/migrations/20260519000001_enable_rls.sql` (new — migration)

**Analog:** None.

**Use ready-to-run SQL from RESEARCH.md** (verbatim):
```sql
ALTER TABLE liikuntapaikat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read"
  ON liikuntapaikat
  FOR SELECT
  USING (true);

CREATE POLICY "authenticated_insert"
  ON liikuntapaikat
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated_update"
  ON liikuntapaikat
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated_delete"
  ON liikuntapaikat
  FOR DELETE
  TO authenticated
  USING (true);
```

---

### `package.json` (modify — remove 2 dependencies)

**Remove these two entries from `"dependencies"`:**
- `"lucide-react": "^1.16.0"` — confirmed unused (no imports in `app/`, `lib/`, `components/`)
- `"tw-animate-css": "^1.4.0"` — Tailwind v4 plugin, incompatible with this project's Tailwind v3

**Command:** `npm uninstall lucide-react tw-animate-css`

**Verify before running:**
```bash
# Expected: no results for either
grep -r "lucide-react" app/ lib/ components/
grep -r "tw-animate-css" app/ lib/ components/ styles/
```

---

## Shared Patterns

### Import Alias Convention
**Source:** All existing files (`lib/lajit.ts`, `lib/utils.ts`, etc.)
**Apply to:** All new files
```typescript
// Always use @/ alias for lib/ and components/ imports
import { supabase } from '@/lib/supabase'
import type { Liikuntapaikka } from '@/lib/types'
import { hintateksti } from '@/lib/utils'
```

### Framer Motion Animation (Enter)
**Source:** `app/components/LiikuntapaikatLista.tsx` lines 88–91 and `app/components/PaikkaKortti.tsx` lines 12–20
**Apply to:** `app/error.tsx`
```typescript
const EASE_OUT: [number, number, number, number] = [0.25, 0.1, 0.25, 1]

// Card enter / error enter:
initial={{ opacity: 0, y: 12 }}
animate={{ opacity: 1, y: 0 }}
transition={{ duration: 0.35, ease: EASE_OUT }}
```

### Animate-Pulse Skeleton Pattern
**Source:** `app/components/Etusivu.tsx` lines 174–180
**Apply to:** `app/loading.tsx`
```tsx
<div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
```
No `'use client'` needed. `animate-pulse` is a Tailwind v3 utility that works server-side.

### NextResponse Error Pattern
**Source:** `app/api/hae-paikat/route.ts` lines 58–63, 136–140
**Apply to:** `app/api/admin/sync-paikat/route.ts`, `app/api/hae-paikat/route.ts` (auth guard additions)
```typescript
return NextResponse.json({ error: 'message' }, { status: 401 })
return NextResponse.json({ error: `Supabase-virhe: ${error.message}` }, { status: 500 })
```

### Indigo Brand Colors
**Source:** `CLAUDE.md` (authoritative) + all existing components
**Apply to:** `app/loading.tsx`, `app/error.tsx`
```
bg-indigo-50   (#EEF2FF) — page background
bg-indigo-600  (#4F46E5) — hero sections, primary buttons
bg-[#6366F1]   — accent (indigo-500), active buttons
text-indigo-950 (#1E1B4B) — headings
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `supabase/migrations/*.sql` | migration | batch | No migration files exist in the project yet |

---

## Metadata

**Analog search scope:** `app/`, `lib/`, `app/api/`, `app/components/`, `app/paikat/`
**Files scanned:** 10 source files read directly
**Pattern extraction date:** 2026-05-19
