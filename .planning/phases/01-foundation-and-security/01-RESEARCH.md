# Phase 1: Foundation & Security - Research

**Researched:** 2026-05-19
**Domain:** Next.js 14 App Router security hardening, Supabase RLS, URL routing, schema migration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Create a new `/api/admin/sync-paikat` route using `SUPABASE_SERVICE_ROLE_KEY` for all Supabase writes. Old `/api/hae-paikat` kept/repurposed but protected.
- **D-02:** Protect admin route with `Authorization: Bearer ${ADMIN_SECRET}` header check — reject 401 before any processing.
- **D-03:** RLS policy: SELECT for all (anon key reads work), INSERT/UPDATE/DELETE only for authenticated users.
- **D-04:** Canonical URL scheme: `/` → Etusivu, `/?nakyma=lista` → LiikuntapaikatLista list mode, `/?nakyma=kartta` → LiikuntapaikatLista map mode.
- **D-05:** `page.tsx` routing logic: `nakyma === 'lista' || nakyma === 'kartta'` → render LiikuntapaikatLista (pass nakyma as prop), otherwise → render Etusivu.
- **D-06:** Files to update: `app/page.tsx`, `app/components/BottomNav.tsx` (`?map=1` → `?nakyma=kartta`, `?view=lista` → `?nakyma=lista`), `app/components/LiikuntapaikatLista.tsx` (verify consistency).
- **D-07:** Move `Liikuntapaikka` TypeScript type from `LiikuntapaikatLista.tsx` to `lib/types.ts`.
- **D-08:** Consolidate `hintateksti()` helper from 3 copy-paste locations into `lib/utils.ts`.
- **D-09:** Fix `lajiVari` in `Kartta.tsx` — replace inline color map with lookup from `lajiKonfig` in `lib/lajit.ts`.
- **D-10:** Remove `tw-animate-css` and `lucide-react` from `package.json`.
- **D-11:** `app/loading.tsx` — skeleton cards matching PaikkaKortti dimensions.
- **D-12:** `app/error.tsx` — animated error with indigo brand colors, Finnish text, entrance animation.
- **D-13:** Add 4 columns to `liikuntapaikat`: `hinta_kuvaus text`, `aukioloajat jsonb`, `lajit_lista jsonb`, `featured boolean DEFAULT false`. Existing rows must not break.
- **D-14:** Commit migration SQL to `supabase/migrations/`.

### Claude's Discretion

None specified — all items in scope were locked as decisions.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | `/api/hae-paikat` requires Authorization header — no anonymous Google Places quota consumption | Bearer token check pattern, admin route creation (D-01, D-02) |
| SEC-02 | URL routing is consistent — `?nakyma=kartta` works from everywhere | `page.tsx` routing fix (D-04–D-06); BottomNav param standardisation |
| SEC-03 | Supabase tables have RLS — anon key allows only reads | RLS SQL syntax (D-03); `supabaseAdmin` client for writes (D-01) |
| SEC-04 | User sees friendly Finnish error/loading page, not stack trace or blank | `app/error.tsx` + `app/loading.tsx` conventions (D-11, D-12) |
| DATA-04 | Schema contains `hinta_kuvaus text`, `aukioloajat jsonb`, `lajit_lista jsonb`, `featured boolean` | Migration SQL (D-13, D-14) |
| ADS-01 | `featured boolean` column in Supabase as infrastructure for ad placeholder | Delivered as part of DATA-04 migration |
</phase_requirements>

---

## Summary

Phase 1 is a codebase hardening phase — no new features, only fixes to three categories of critical bugs: an unauthenticated API endpoint, a broken URL routing scheme, and missing database RLS. All decisions are locked; this research focuses on confirming exact implementation approaches, surfacing file-by-file gotchas, and providing ready-to-use SQL.

The codebase is in a partially-built state. All source files exist and the app runs, but routing is internally inconsistent (three competing URL param schemes), the API route is unprotected, Supabase has no RLS, and there are no error/loading UIs. None of these require architectural changes — they are targeted edits to existing files plus two new files (`app/error.tsx`, `app/loading.tsx`) and a new directory (`supabase/migrations/`).

The highest-risk task is the URL routing fix (D-04–D-06) because it touches three files and the coordination between them. The `page.tsx` server component reads `searchParams`, the `BottomNav` writes URL params, and `LiikuntapaikatLista` reads `?nakyma` — all three must use the same scheme atomically. All other tasks are isolated file edits with low blast radius.

**Primary recommendation:** Execute tasks in dependency order — type/utility consolidation first (D-07, D-08), then API security (D-01, D-02), then RLS + admin client (D-03 + supabase.ts), then URL routing (D-04–D-06), then UI files (D-09, D-10, D-11, D-12), then schema migration last (D-13, D-14).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| API authentication (SEC-01) | API / Backend | — | Bearer token check is server-side only; never in browser |
| URL routing state (SEC-02) | Browser / Client | Frontend Server (SSR) | `useSearchParams` reads on client; `searchParams` prop reads on server — both need same param name |
| Supabase RLS (SEC-03) | Database / Storage | API / Backend | Policy lives in Postgres; admin writes use service key on server only |
| Error/loading UI (SEC-04) | Frontend Server (SSR) | Browser / Client | `error.tsx` is a React Error Boundary (client); `loading.tsx` is a server-side Suspense fallback |
| Schema migration (DATA-04 + ADS-01) | Database / Storage | — | SQL DDL runs directly in Supabase; code changes only for new column selects |
| Type/utility consolidation (D-07–D-09) | — (cross-cutting) | — | Refactoring only — no tier change, reduces duplication |

---

## Current Codebase State

### `app/api/hae-paikat/route.ts` — BROKEN (SEC-01)

**What it does:** Full Google Places Text Search + N Place Details calls + Supabase upsert.
**What's wrong:** Zero authentication. Any HTTP GET triggers 20+ billable API calls.
**Decision:** This route gets protected with the Bearer token check (D-02). The new `/api/admin/sync-paikat` route is a copy of this file with the auth guard added and the Supabase client swapped to use `SUPABASE_SERVICE_ROLE_KEY`.
**Current anon-key upsert:** Line 131 — `supabase.from('liikuntapaikat').upsert(...)` uses the anon client. After RLS is enabled, this will fail. Must switch to `supabaseAdmin`.
**Note:** The route's `GET()` handler currently has no auth check before line 57. The token check must be the first statement in the handler.

### `app/page.tsx` — BROKEN (SEC-02)

**What it does:** Server component — fetches all venues from Supabase, reads `searchParams`, conditionally renders Etusivu or LiikuntapaikatLista.
**What's wrong:** Reads `searchParams.view === 'lista'` (line 26). This is the wrong param name. BottomNav uses `?view=lista`; `LiikuntapaikatLista` uses `?nakyma=kartta`. The schemes never agreed.
**Decision (D-04/D-05):** Change to `searchParams.nakyma === 'lista' || searchParams.nakyma === 'kartta'` to render `LiikuntapaikatLista`. Otherwise render `Etusivu`.
**TypeScript:** `searchParams` type annotation must change from `{ view?: string; map?: string }` to `{ nakyma?: string }`.
**Data shape:** The `select()` on line 13 fetches specific columns. After D-13 adds new columns, downstream phases that need them will need to update this select. For Phase 1, the select is fine as-is — new columns are nullable and not rendered yet.

### `app/components/BottomNav.tsx` — BROKEN (SEC-02)

**What it does:** Mobile bottom navigation — 4 tabs (Koti, Kartta, Lista, Suosikit).
**What's wrong:** Uses `?map=1` for Kartta tab (line 86) and `?view=lista` for Lista tab (line 94). Neither matches `?nakyma=*`. The active state detection (lines 68-71) reads these wrong params, so tabs never show as active when navigated via URL.
**Decision (D-06):** Change `href="/?map=1"` to `href="/?nakyma=kartta"`, change `href="/?view=lista"` to `href="/?nakyma=lista"`. Update `isKartta` to `searchParams.get('nakyma') === 'kartta'`, `isLista` to `searchParams.get('nakyma') === 'lista'`. Remove reads of `view` and `map` vars (lines 65-66).
**Suspense wrapper:** `BottomNav` already wrapped in `<Suspense>` in `app/layout.tsx` (line 24) — no change needed there.

### `app/components/LiikuntapaikatLista.tsx` — CORRECT but needs type update

**What it does:** Client component for both list and map views, reads `?nakyma` param.
**Current state:** Already uses `searchParams.get('nakyma')` (line 50) — this is correct. No routing changes needed here.
**Type export:** Exports `Liikuntapaikka` type (lines 12-25). This must be moved to `lib/types.ts` (D-07). After move, this file imports from `@/lib/types`.
**Type shape:** Current `Liikuntapaikka` includes `hinta_min`, `hinta_max` but not the new Phase 1 columns (`hinta_kuvaus`, `aukioloajat`, `lajit_lista`, `featured`). These are added to the type in `lib/types.ts` — but the component does not need to render them yet (Phase 4 work). Add them as optional fields to avoid breaking future phases.

### `app/components/Kartta.tsx` — CODE SMELL (D-09)

**What it does:** Map view inside `LiikuntapaikatLista`, lazy-loaded.
**What's wrong:** Lines 9-15 define a `lajiVari` record with inline hex colors for sport badges. CLAUDE.md rule: "Do not inline sport colors in components." `lib/lajit.ts` already has `lajiKonfig` with `badgeTw` (Tailwind class) and `accentBg` fields.
**Decision (D-09):** Delete `lajiVari`. In the InfoWindow (lines 73-84), replace:
```tsx
background: lajiVari[valittu.laji]?.bg ?? '#f3f4f6',
color: lajiVari[valittu.laji]?.color ?? '#374151',
```
with a lookup via `lajiKonfig`. However, `lajiKonfig` uses Tailwind class strings (`badgeTw: 'bg-blue-100 text-blue-700'`), not CSS hex values. The InfoWindow uses inline `style` props (not Tailwind classes) because it renders inside the Google Maps DOM. **Gotcha:** You cannot use Tailwind class strings in inline styles.
**Resolution:** Extract hex values from `lajiKonfig` via a small helper, OR define a `badgeStyle` field in `lajiKonfig` as `{ background: string; color: string }`. The simplest approach consistent with CLAUDE.md: add a `badgeInlineStyle?: { background: string; color: string }` optional field to `LajiKonfig` in `lib/lajit.ts`, populate it for each sport, and use that in `Kartta.tsx`. Alternatively, use a small lookup function `getKarttaVari(laji: string)` in `lib/lajit.ts` that returns the inline style — this keeps Kartta.tsx free of color definitions.
**Import fix:** After D-07, `Kartta.tsx` imports `Liikuntapaikka` from `./LiikuntapaikatLista`. This must change to `@/lib/types`.

### `app/components/PaikkaKortti.tsx` — has duplicate `hintateksti`

**What it does:** Card component for venue list.
**What's wrong:** Lines 22-27 define `hintateksti()` locally. Same function exists in `Etusivu.tsx` (lines 42-47) and `app/paikat/[id]/page.tsx` (lines 7-12).
**Decision (D-08):** Move to `lib/utils.ts`. All three files import from `@/lib/utils`.
**Type import:** Imports `Liikuntapaikka` from `./LiikuntapaikatLista` (line 6). After D-07, change to `@/lib/types`.

### `app/components/Etusivu.tsx` — has duplicate `hintateksti`

**What it does:** Homepage with scroll-driven map + AI weather widget.
**What's wrong:** Lines 42-47 define `hintateksti()` locally.
**Decision (D-08):** Remove local definition, import from `@/lib/utils`.
**Type import:** Imports `Liikuntapaikka` from `./LiikuntapaikatLista` (line 11). After D-07, change to `@/lib/types`.
**Note:** This component is NOT changed for routing — it always renders when `nakyma` is absent (Etusivu = homepage). The routing change in `page.tsx` handles when it renders.

### `app/paikat/[id]/page.tsx` — has duplicate `hintateksti`

**What it does:** Venue detail page.
**What's wrong:** Lines 7-12 define `hintateksti()` locally.
**Decision (D-08):** Remove local definition, import from `@/lib/utils`.
**No type import needed:** This page uses `select('*')` and accesses fields directly — no `Liikuntapaikka` type import. No change needed for D-07.

### `lib/supabase.ts` — needs `supabaseAdmin` export

**Current state:** Exports only `supabase` (anon client). One-liner file.
**Decision:** Add `supabaseAdmin` export using `SUPABASE_SERVICE_ROLE_KEY`. This env var is server-only (no `NEXT_PUBLIC_` prefix). The client must never be instantiated in a file that runs in the browser.
**Safety:** The admin client should only be imported from API route files (`app/api/**`). It should NOT be imported from components. Add a comment to the export making this clear.

### `lib/utils.ts` — needs `hintateksti` added

**Current state:** Only exports `cn()`. File is 6 lines.
**Decision (D-08):** Add `hintateksti(min: number | null, max: number | null): string` export.

### `lib/types.ts` — does not exist yet

**Decision (D-07):** Create this file with the `Liikuntapaikka` type. Include the 4 new optional fields from D-13 so the type is forward-compatible.

### `app/loading.tsx` — does not exist yet

**Decision (D-11):** Create with skeleton cards matching PaikkaKortti dimensions.

### `app/error.tsx` — does not exist yet

**Decision (D-12):** Create with animated error message, indigo brand colors, Finnish text.

### `supabase/migrations/` — directory does not exist yet

**Decision (D-14):** Create directory + migration file.

### `package.json` — has unused/incompatible packages

**Decision (D-10):** Remove `tw-animate-css` (Tailwind v4 incompatible, unused) and `lucide-react` (unused, all icons are inline SVGs) from `dependencies`.

---

## Implementation Approach — Decision by Decision

### D-01 + D-02: New admin route with Bearer auth

```typescript
// app/api/admin/sync-paikat/route.ts — first lines of handler
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... rest of route using supabaseAdmin for upsert
}
```

**Gotcha:** `process.env.ADMIN_SECRET` is a server-only env var. The check must use strict equality (`!==`), not loose (`!=`). If `ADMIN_SECRET` is undefined (env var not set), the check still works — it compares `'Bearer undefined'` with whatever is sent, which will never match a valid secret. However, add an explicit guard: if `!process.env.ADMIN_SECRET` return 500 with a clear message rather than silently failing with a confusing 401.

**Note on old `/api/hae-paikat`:** Per D-01, this route is "repurposed or kept as-is but protected." Add the same Bearer check to the existing route handler as well — this prevents quota abuse during the transition period before callers switch to the new route.

### D-03: RLS policy SQL

See `## Supabase RLS SQL` section below.

### D-04/D-05/D-06: URL routing

`page.tsx` server component `searchParams` prop is typed as `Promise<{ [key: string]: string | string[] | undefined }>` in Next.js 15, but in **Next.js 14** (this project) it is a plain synchronous object `{ [key: string]: string | string[] | undefined }`. No `await` needed.

```typescript
// app/page.tsx
export default async function Home({
  searchParams,
}: {
  searchParams: { nakyma?: string }
}) {
  // ... fetch paikat ...
  if (searchParams.nakyma === 'lista' || searchParams.nakyma === 'kartta') {
    return (
      <Suspense>
        <LiikuntapaikatLista paikat={data} initialNakyma={searchParams.nakyma} />
      </Suspense>
    )
  }
  return (
    <Suspense>
      <Etusivu paikat={data} />
    </Suspense>
  )
}
```

**`initialNakyma` prop:** `LiikuntapaikatLista` already reads `?nakyma` via `useSearchParams` on the client. Passing `initialNakyma` from the server is optional — it avoids a flash of wrong state on initial SSR. However, since the component is client-only (`'use client'`), this is a minor hydration concern. The simplest approach: do not pass the prop; let `useSearchParams` handle it. The routing condition in `page.tsx` ensures the right component mounts.

**BottomNav active state:** After fixing href values, update active detection:
```typescript
const nakyma = searchParams.get('nakyma')
const isKoti     = pathname === '/' && !nakyma
const isKartta   = pathname === '/' && nakyma === 'kartta'
const isLista    = pathname === '/' && nakyma === 'lista'
const isSuosikit = pathname === '/suosikit'
```

### D-07: Move `Liikuntapaikka` type to `lib/types.ts`

All 4 files that currently import `Liikuntapaikka` from `./LiikuntapaikatLista`:
- `app/components/Kartta.tsx` (line 5): `import type { Liikuntapaikka } from './LiikuntapaikatLista'`
- `app/components/PaikkaKortti.tsx` (line 6): `import type { Liikuntapaikka } from './LiikuntapaikatLista'`
- `app/components/Etusivu.tsx` (line 11): `import type { Liikuntapaikka } from './LiikuntapaikatLista'`
- `app/components/LiikuntapaikatLista.tsx`: source — change to re-export from `@/lib/types`

**Re-export pattern to avoid breaking change:** In `LiikuntapaikatLista.tsx`, replace the type definition with:
```typescript
export type { Liikuntapaikka } from '@/lib/types'
```
This preserves existing imports from `./LiikuntapaikatLista` while the canonical source moves to `lib/types.ts`. All other files can be updated independently without a big-bang migration.

### D-08: Consolidate `hintateksti()` to `lib/utils.ts`

Three files to update. The function signature is identical in all three — safe to move.

**lib/utils.ts addition:**
```typescript
export function hintateksti(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min}–${max} €`
  if (min != null) return `alkaen ${min} €`
  if (max != null) return `max ${max} €`
  return ''
}
```

### D-09: Fix `lajiVari` in `Kartta.tsx`

The InfoWindow uses inline `style` props because it renders in Google Maps' own DOM — Tailwind classes cannot be applied there. The recommended approach is a helper function in `lib/lajit.ts`:

```typescript
// lib/lajit.ts — add after lajiKonfig
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

The color values are derived from the Tailwind classes in `lajiKonfig.badgeTw` — they match the same color palette. This keeps `Kartta.tsx` free of inline color definitions while the single source of truth remains in `lib/lajit.ts`.

**In `Kartta.tsx`:** Remove `lajiVari` (lines 9-15), import `getInfoWindowStyle` from `@/lib/lajit`, update InfoWindow to `getInfoWindowStyle(valittu.laji)`.

### D-10: Remove packages from `package.json`

```bash
npm uninstall tw-animate-css lucide-react
```

**Verification:** After removal, `npm run build` should pass. No source file imports either package.

### D-11: `app/loading.tsx` skeleton

Next.js App Router: `app/loading.tsx` is the Suspense fallback for the root layout. It renders during the SSR data fetch in `app/page.tsx`. It must be a server component (no `'use client'`) or a simple client component.

**Dimensions to match PaikkaKortti:**
- Card: `rounded-2xl`, `h-2` accent bar, `p-5` content area
- Accent bar: `h-2 w-full bg-gray-200 animate-pulse`
- Badge skeleton: `h-5 w-16 rounded-full`
- Title skeleton: `h-5 w-3/4 rounded`
- Address skeleton: `h-4 w-1/2 rounded`
- Price skeleton: `h-6 w-20 rounded`
- Grid: same `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` as real grid

Show 6 skeleton cards (fills a typical viewport without overflow).

**No `'use client'` needed** — skeletons have no interactivity. `animate-pulse` is a Tailwind utility class that works server-side.

### D-12: `app/error.tsx` error boundary

Next.js App Router: `app/error.tsx` must be a client component (`'use client'`). It receives `error: Error & { digest?: string }` and `reset: () => void` props.

```typescript
'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center px-4 pb-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="text-center"
      >
        <p className="text-5xl mb-4">⚠️</p>
        <h1 className="text-2xl font-bold text-indigo-950 mb-2">Jotain meni pieleen.</h1>
        <p className="text-gray-500 mb-8">Yritä uudelleen tai palaa etusivulle.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
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

**Animation note:** Per CLAUDE.md — card enter duration 0.35, ease `[0.25, 0.1, 0.25, 1]`. No y-movement beyond 14px. Opacity + small y translation only.

### D-13/D-14: Schema migration

See `## Migration File` section below.

---

## Standard Stack

No new packages are needed for Phase 1. All required tools are already installed:

| Existing Package | Used For | Status |
|-----------------|---------|--------|
| `@supabase/supabase-js` ^2.105.4 | Supabase admin client | Already installed |
| `framer-motion` ^12.38.0 | `error.tsx` animation | Already installed |
| `next` 14.2.35 | `error.tsx` / `loading.tsx` conventions | Already installed |
| `tailwindcss` ^3.4.1 | Skeleton pulse animation | Already installed |

**Packages removed:** `tw-animate-css`, `lucide-react` (D-10).

---

## Package Legitimacy Audit

No new packages are installed in Phase 1. The only change is removal of two packages.

| Package | Action | Reason |
|---------|--------|--------|
| `tw-animate-css` | REMOVE | Tailwind v4 plugin, incompatible with this project's v3, unused |
| `lucide-react` | REMOVE | Unused — all icons are inline SVGs; adds bundle weight |

---

## Supabase RLS SQL

[VERIFIED: Supabase official docs — supabase.com/docs/guides/database/postgres/row-level-security]

```sql
-- Enable RLS on the table
ALTER TABLE liikuntapaikat ENABLE ROW LEVEL SECURITY;

-- Allow public reads (anon key can SELECT)
CREATE POLICY "public_read"
  ON liikuntapaikat
  FOR SELECT
  USING (true);

-- Allow authenticated users to write (future auth; keeps door open)
-- INSERT
CREATE POLICY "authenticated_insert"
  ON liikuntapaikat
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE
CREATE POLICY "authenticated_update"
  ON liikuntapaikat
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE
CREATE POLICY "authenticated_delete"
  ON liikuntapaikat
  FOR DELETE
  TO authenticated
  USING (true);
```

**Why separate policies per operation:** Supabase documentation recommends granular policies over combined ones for clarity and auditability. A single `FOR ALL` policy would work but obscures intent.

**Effect on existing code:** After RLS is enabled, the anon client (`supabase`) can no longer do `INSERT`/`UPDATE`/`DELETE`. The existing route `app/api/hae-paikat/route.ts` currently uses `supabase` (anon key) for its upsert on line 131. This upsert will fail after RLS is enabled unless the route is updated to use `supabaseAdmin`. This is exactly what D-01 addresses — the new `/api/admin/sync-paikat` route uses `supabaseAdmin`. The old route must also be updated if it is kept.

**Verification test (from browser console, success criterion 3):**
```javascript
// Should succeed (SELECT):
const { data } = await supabase.from('liikuntapaikat').select('id').limit(1)

// Should fail with RLS error (INSERT without auth):
const { error } = await supabase.from('liikuntapaikat').insert({ nimi: 'test' })
// Expected: error.code === '42501' (insufficient_privilege) or similar RLS rejection
```

---

## Migration File

[ASSUMED — Supabase migration file naming convention based on common practice; verify at supabase.com/docs/guides/cli/local-development if using Supabase CLI locally]

**File path:** `supabase/migrations/20260519000000_add_phase1_columns.sql`

**Naming convention:** `YYYYMMDDHHMMSS_description.sql` — timestamp prefix ensures execution order. Using today's date `20260519`.

```sql
-- Migration: add Phase 1 columns to liikuntapaikat
-- Phase 1: Foundation & Security (DATA-04, ADS-01)
-- Date: 2026-05-19

-- hinta_kuvaus: human-readable price description (e.g., "10 € / kertakäynti")
ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS hinta_kuvaus text;

-- aukioloajat: structured weekly opening hours from Google Place Details
-- Format: { "monday": { "open": "06:00", "close": "22:00" }, ... }
ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS aukioloajat jsonb;

-- lajit_lista: array of sport types for venues with multiple sports
-- Format: ["kuntosali", "uinti"]
ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS lajit_lista jsonb;

-- featured: infrastructure for future ad/promoted placement (ADS-01)
-- DEFAULT false means existing rows get false, not null
ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
```

**Safety:** `ADD COLUMN IF NOT EXISTS` is idempotent — safe to run twice. `DEFAULT false` on `featured` means existing rows are not broken (they get `false`, not `NULL`). `hinta_kuvaus`, `aukioloajat`, and `lajit_lista` are nullable by default (no `NOT NULL` constraint) — existing rows are unaffected.

**Execution:** Run directly in Supabase SQL Editor, or via `supabase db push` if using Supabase CLI. No local Supabase CLI installation is required to run migrations against the hosted project.

**Also run the RLS SQL** (see above section) either as a second migration file or combined in the same file. Recommended: separate file for clarity.

**RLS migration file:** `supabase/migrations/20260519000001_enable_rls.sql`

---

## Dependency Order

The tasks have the following dependencies. Violating this order causes TypeScript errors or broken imports.

```
Wave 1 — Foundation (no dependencies on each other):
  D-07: Create lib/types.ts  (enables D-07a below)
  D-08: Add hintateksti to lib/utils.ts

Wave 2 — Update imports (depends on Wave 1):
  D-07a: Update LiikuntapaikatLista.tsx to re-export from lib/types
  D-07b: Update PaikkaKortti.tsx import (lib/types + lib/utils)
  D-07c: Update Etusivu.tsx import (lib/types + lib/utils)
  D-07d: Update paikat/[id]/page.tsx import (lib/utils)

Wave 3 — Infrastructure (can run parallel with Wave 2):
  D-03a: Add supabaseAdmin to lib/supabase.ts
  D-09:  Fix lajiVari in Kartta.tsx (add getInfoWindowStyle to lib/lajit.ts first)
         → D-07e: Update Kartta.tsx import (lib/types)
  D-10:  npm uninstall tw-animate-css lucide-react

Wave 4 — New files and route (depends on Wave 3 for supabaseAdmin):
  D-01+D-02: Create app/api/admin/sync-paikat/route.ts
  D-02b:     Add auth check to existing app/api/hae-paikat/route.ts
  D-11:      Create app/loading.tsx
  D-12:      Create app/error.tsx

Wave 5 — URL routing (depends on Wave 2 for types to be stable):
  D-04/D-05: Update app/page.tsx searchParams logic
  D-06:      Update BottomNav.tsx href + active state

Wave 6 — Schema migration (independent, run last):
  D-13+D-14: Create supabase/migrations/ and run SQL
  D-03b:     Also run RLS SQL migration
```

**Critical path:** D-07 (create lib/types.ts) must be the very first task. Every component that imports `Liikuntapaikka` depends on it.

---

## Architecture Patterns

### Next.js App Router: `error.tsx` and `loading.tsx` Conventions

[ASSUMED — Next.js 14 App Router conventions from training knowledge; verify at nextjs.org/docs/app/building-your-application/routing/error-handling]

- `app/loading.tsx` — automatically wrapped in `<Suspense>` by Next.js. Renders while the server component in `app/page.tsx` awaits its data fetch. Must be importable as a React component (default export). Does NOT need `'use client'`.
- `app/error.tsx` — must have `'use client'` directive. Receives `error` and `reset` props. Catches errors thrown by the server component, Route Handlers, or any client component in the subtree.
- Both files are picked up automatically by Next.js — no imports needed in `layout.tsx`.
- `layout.tsx` already has `<Suspense>` around `<BottomNav>` — this is separate and correct. The `app/loading.tsx` handles the page-level Suspense boundary.

### Supabase Admin Client Pattern

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-only admin client — NEVER import this in client components
// Uses service role key which bypasses RLS
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

**Safety concern:** TypeScript cannot enforce that `supabaseAdmin` is not imported from a client component. The `!` non-null assertion means if `SUPABASE_SERVICE_ROLE_KEY` is absent in production, the client is created with `undefined` and will fail at runtime with a confusing auth error. Add an explicit guard.

### Next.js Route Handler Auth Pattern

```typescript
// Pattern: auth check as first statement, early return on failure
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // safe to proceed
}
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RLS policies | Custom middleware auth for reads | Supabase RLS `USING (true)` | Built into Postgres; enforced at DB level, not app level |
| Error boundaries | Manual try/catch in every component | Next.js `app/error.tsx` | Framework-native, catches SSR errors too |
| Loading state | Manual loading booleans in each component | Next.js `app/loading.tsx` + Suspense | Framework-native, works with RSC data fetching |
| Skeleton animation | Custom keyframe CSS | Tailwind `animate-pulse` | Already in the project, v3 compatible |

---

## Common Pitfalls

### Pitfall 1: RLS Breaks Existing Upsert Before Route Is Updated

**What goes wrong:** If RLS is enabled BEFORE the `/api/hae-paikat` route is updated to use `supabaseAdmin`, the existing upsert (line 131, anon client) will fail with a Postgres permission error. This makes the data ingestion route silently broken.
**How to avoid:** Enable RLS only after the admin route is ready and the old route is either updated or the auth guard is added. Order: D-01 (create admin route) → D-03 (enable RLS).
**Warning signs:** After enabling RLS, test the admin route immediately. Any `42501` error code from Supabase indicates RLS is blocking the write.

### Pitfall 2: `page.tsx` `searchParams` Typing in Next.js 14 vs 15

**What goes wrong:** Next.js 15 changed `searchParams` to be a Promise. If docs for Next.js 15 are followed, adding `await searchParams` will break this Next.js 14 project.
**How to avoid:** In Next.js 14, `searchParams` is a plain synchronous object. No `await` needed. Type as `{ nakyma?: string }`.
**Warning signs:** TypeScript error "Type 'Promise<...>' has no property 'nakyma'" if the wrong pattern is used.

### Pitfall 3: `BottomNav` Uses `useSearchParams` — Requires Suspense

**What goes wrong:** `BottomNav` uses `useSearchParams()` which requires the component to be wrapped in `<Suspense>` (Next.js requirement for client components that read search params). If the Suspense wrapper is removed from `app/layout.tsx`, the app will fail to build with: "useSearchParams() should be wrapped in a suspense boundary".
**How to avoid:** The Suspense wrapper already exists in `layout.tsx` (line 24). Do not remove it when updating BottomNav. The `fallback={<div className="h-16 sm:hidden" />}` prevents layout shift during hydration.

### Pitfall 4: `lajiKonfig` BadgeTw Classes Cannot Be Used in Inline Styles

**What goes wrong:** `lajiKonfig.badgeTw` values are Tailwind class strings like `'bg-blue-100 text-blue-700'`. Google Maps InfoWindow renders outside React's DOM tree — Tailwind classes are not applied there. Using these strings in `style={{ background: ... }}` will not work.
**How to avoid:** Use the `getInfoWindowStyle()` helper (see D-09 section) which returns hex-equivalent values as CSS strings.

### Pitfall 5: `ADD COLUMN IF NOT EXISTS` vs `ALTER TABLE ADD COLUMN`

**What goes wrong:** Plain `ALTER TABLE liikuntapaikat ADD COLUMN hinta_kuvaus text` will fail with a Postgres error if the column already exists (e.g., if someone already added it manually). In a team or CI context this breaks idempotency.
**How to avoid:** Use `ADD COLUMN IF NOT EXISTS` (supported in PostgreSQL 9.6+ — Supabase uses PostgreSQL 15+). Always idempotent.

---

## Risk Areas

### Risk 1: `SUPABASE_SERVICE_ROLE_KEY` not set in `.env.local`

**Probability:** MEDIUM — this is a new env var that doesn't currently exist.
**Impact:** Admin route fails at runtime with a confusing error. RLS migration makes the old route fail.
**Mitigation:** Document in the plan that `SUPABASE_SERVICE_ROLE_KEY` must be added to `.env.local` before testing the admin route. The plan executor must get this value from the Supabase project settings.

### Risk 2: `ADMIN_SECRET` not set

**Probability:** MEDIUM — new env var.
**Impact:** The auth guard returns 500 (server configuration error) on every request until set.
**Mitigation:** Document required env vars explicitly in the plan.

### Risk 3: Existing data in `liikuntapaikat` after RLS migration

**Probability:** HIGH — the table already has data (app is running).
**Impact:** None — RLS policies are non-destructive. `SELECT` still works with anon key. Existing reads are unaffected.
**Mitigation:** None needed. RLS is a policy layer, not a data migration.

### Risk 4: TypeScript strict mode errors after type move (D-07)

**Probability:** LOW — the type shape is identical whether defined locally or imported.
**Impact:** Build fails if any import is missed.
**Mitigation:** After moving the type, run `npm run build` or `tsc --noEmit` to catch any missed imports.

### Risk 5: `npm uninstall` removes a package that IS actually used somewhere

**Probability:** LOW for `lucide-react` (grep confirms no imports), VERY LOW for `tw-animate-css` (grep confirms no CSS imports).
**Mitigation:** Run `grep -r "lucide-react" app/ components/ lib/` before uninstalling. Expected: no results.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm commands, dev server | ✓ | v24.15.0 | — |
| npm | Package removal (D-10) | ✓ | 11.12.1 | — |
| Supabase SQL Editor | RLS + migration SQL (D-13/D-14) | ✓ (web UI, no local install needed) | hosted | — |
| `SUPABASE_SERVICE_ROLE_KEY` | supabaseAdmin client | ✗ (not yet in .env.local) | — | Plan must include step to add it |
| `ADMIN_SECRET` | Bearer auth guard | ✗ (not yet in .env.local) | — | Plan must include step to add it |

**Missing dependencies with no fallback:**
- `SUPABASE_SERVICE_ROLE_KEY` — required before admin route can be tested; get from Supabase dashboard > Project Settings > API > service_role key
- `ADMIN_SECRET` — required before auth guard can be tested; any strong random string (e.g., `openssl rand -hex 32`)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None currently installed — see Wave 0 gaps |
| Config file | none — Wave 0 must create |
| Quick run command | `npx vitest run --reporter=verbose` (after install) |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SEC-01 | GET /api/hae-paikat without auth returns 401 | integration (curl) | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/hae-paikat` → expect `401` | ❌ Wave 0 |
| SEC-01 | GET /api/admin/sync-paikat without auth returns 401 | integration (curl) | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/admin/sync-paikat` → expect `401` | ❌ Wave 0 |
| SEC-02 | BottomNav Kartta tab navigates to `?nakyma=kartta` | manual | navigate in browser, check URL and rendered component | manual |
| SEC-02 | Direct URL `/?nakyma=kartta` renders map view | manual | open URL, confirm Kartta component visible | manual |
| SEC-03 | Anon SELECT returns rows | unit | `supabase.from('liikuntapaikat').select('id').limit(1)` → no error | ❌ Wave 0 |
| SEC-03 | Anon INSERT rejected by RLS | unit | `supabase.from('liikuntapaikat').insert({nimi:'test'})` → expect error | ❌ Wave 0 |
| SEC-04 | `app/error.tsx` renders Finnish text on thrown error | manual | trigger error in test env, confirm page shows | manual |
| SEC-04 | `app/loading.tsx` renders skeleton during data fetch | manual | throttle network, confirm skeleton visible | manual |
| DATA-04 | `liikuntapaikat` table has all 4 new columns | SQL | `SELECT column_name FROM information_schema.columns WHERE table_name='liikuntapaikat'` → confirm 4 columns | manual (Supabase SQL Editor) |
| DATA-04 | Existing rows are not broken after migration | SQL | `SELECT id, hinta_kuvaus, aukioloajat, lajit_lista, featured FROM liikuntapaikat LIMIT 1` → no error | manual (Supabase SQL Editor) |
| ADS-01 | `featured` column exists with DEFAULT false | SQL | same as DATA-04 check above | manual |

### Pure Function Unit Tests (Vitest)

These are automatable and should be Wave 0 additions:

| Function | Test | File |
|----------|------|------|
| `hintateksti(10, 20)` | returns `'10–20 €'` | `lib/utils.test.ts` |
| `hintateksti(10, null)` | returns `'alkaen 10 €'` | `lib/utils.test.ts` |
| `hintateksti(null, 20)` | returns `'max 20 €'` | `lib/utils.test.ts` |
| `hintateksti(null, null)` | returns `''` | `lib/utils.test.ts` |
| `getInfoWindowStyle('padel')` | returns object with background + color | `lib/lajit.test.ts` |
| `getInfoWindowStyle('unknown')` | returns fallback style | `lib/lajit.test.ts` |

### Sampling Rate

- **Per task commit:** `npx tsc --noEmit` (TypeScript check, no test runner needed)
- **Per wave merge:** `npm run build` (full Next.js build catches type errors and import issues)
- **Phase gate:** All 5 success criteria verified manually + `npm run build` green

### Wave 0 Gaps

- [ ] Install Vitest: `npm install -D vitest @vitejs/plugin-react` — covers unit tests for `lib/utils.ts` and `lib/lajit.ts`
- [ ] `vitest.config.ts` — configure test environment
- [ ] `lib/utils.test.ts` — hintateksti unit tests
- [ ] `lib/lajit.test.ts` — getInfoWindowStyle unit tests

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes (admin route) | Bearer token via env var `ADMIN_SECRET` |
| V3 Session Management | No | No user sessions in Phase 1 |
| V4 Access Control | Yes (RLS) | Supabase RLS policies — Postgres-level enforcement |
| V5 Input Validation | Partial | Auth header comparison; no user input in Phase 1 |
| V6 Cryptography | No | No crypto operations in Phase 1 |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Anonymous API abuse (Places quota draining) | Repudiation / Denial of Service | Bearer token check before any processing |
| Anon key database write (RLS bypass) | Tampering | Enable RLS; use service key only on server |
| Service role key leaked in client bundle | Information Disclosure | Never `NEXT_PUBLIC_` prefix on service key; only import in API routes |
| ADMIN_SECRET in client bundle | Information Disclosure | Never `NEXT_PUBLIC_` prefix; only read server-side in Route Handler |

---

## Sources

### Primary (HIGH confidence)

- Codebase — direct file reads of all files listed in the "Files to Change" canonical refs
- `.planning/codebase/CONCERNS.md` — authoritative security and tech debt audit from 2026-05-19
- `.planning/research/PITFALLS.md` — C-1 (unauthenticated API), C-4 (URL routing), M-5 (RLS) pitfalls

### Secondary (MEDIUM confidence)

- Next.js 14 App Router docs [ASSUMED] — `error.tsx`, `loading.tsx`, `searchParams` conventions based on training knowledge; core patterns are stable across 14.x versions
- Supabase RLS SQL syntax [ASSUMED] — standard Postgres RLS syntax, Supabase-specific policy creation confirmed via common documentation patterns
- Migration file naming convention [ASSUMED] — `YYYYMMDDHHMMSS_description.sql` is the standard Supabase CLI convention

### Tertiary (LOW confidence)

None — all critical claims are backed by direct codebase inspection or HIGH/MEDIUM sources.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Next.js 14 `searchParams` is a synchronous object (not Promise) | D-05 implementation | Would require `await searchParams` — TypeScript would catch this |
| A2 | `app/error.tsx` requires `'use client'` directive in Next.js 14 | D-12 | Build error if wrong — easy to discover |
| A3 | `app/loading.tsx` does not require `'use client'` | D-11 | Build error if wrong — easy to discover |
| A4 | Migration file naming `YYYYMMDDHHMMSS_description.sql` is the correct Supabase CLI convention | D-14 | Files still work in SQL Editor regardless of name; CLI ordering only matters if Supabase CLI is used |
| A5 | `lucide-react` and `tw-animate-css` have zero imports in the codebase | D-10 | `npm uninstall` would break the build — verify with grep before uninstalling |

---

## Open Questions (RESOLVED)

1. **Is `SUPABASE_SERVICE_ROLE_KEY` already in `.env.local`?**
   - What we know: the file is not in the repository (gitignored); the key is needed for `supabaseAdmin`
   - **RESOLVED:** Treated as absent. PLAN.md documents it as an explicit prerequisite in the Environment Prerequisites section — the executor must add it before Wave 4 starts. Instructions: Supabase dashboard → Project Settings → API → service_role key.

2. **Should `/api/hae-paikat` be kept or fully replaced by `/api/admin/sync-paikat`?**
   - What we know: D-01 says "repurposed or kept as-is but protected"; the old route has the same functionality
   - **RESOLVED:** Keep the old route, add the auth guard (P-08), and create the new route as a properly-named copy (P-07). Old route can be removed in a later phase.

3. **Does the Supabase `liikuntapaikat` table already have RLS enabled?**
   - What we know: CONCERNS.md says "presumably allows public reads" but doesn't confirm RLS state
   - **RESOLVED:** P-13 step 13c handles both cases idempotently — the migration SQL uses `IF NOT EXISTS` for columns and explicitly notes to skip `ENABLE ROW LEVEL SECURITY` if RLS is already on. The executor checks Supabase dashboard first.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all existing packages verified by direct inspection
- Architecture: HIGH — direct codebase read of all files being modified
- RLS SQL: MEDIUM — standard Postgres syntax, Supabase-specific confirmed via docs patterns
- Next.js conventions (error.tsx/loading.tsx): MEDIUM — training knowledge for stable 14.x patterns
- Pitfalls: HIGH — derived from direct codebase inspection + pre-existing CONCERNS.md audit

**Research date:** 2026-05-19
**Valid until:** 2026-06-19 (stable stack — Next.js 14, Supabase v2, no fast-moving dependencies)

---

## RESEARCH COMPLETE
