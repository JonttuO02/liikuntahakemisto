# PLAN.md — Phase 1: Foundation & Security

**Phase goal:** The app is safe to ship — APIs are protected, routing works everywhere, data model is ready for all v1 features
**Mode:** mvp
**Requirements:** SEC-01, SEC-02, SEC-03, SEC-04, DATA-04, ADS-01
**Research:** `01-RESEARCH.md` (HIGH confidence)
**Patterns:** `01-PATTERNS.md`

---

## Threat Model

| Threat | Vector | Mitigation | Plan |
|--------|--------|-----------|------|
| Google Places quota drain | Anonymous HTTP GET to `/api/hae-paikat` | Bearer token auth guard as first statement in handler | P-07, P-08 |
| Supabase write abuse | Anon key INSERT/UPDATE/DELETE | RLS policies: SELECT for all, writes for authenticated only | P-13 |
| Service role key exposure | `NEXT_PUBLIC_` prefix or client component import | Server-only env var; comment on export | P-04 |
| ADMIN_SECRET exposure | `NEXT_PUBLIC_` prefix | Server-only env var; no `NEXT_PUBLIC_` prefix | P-07 |

---

## Environment Prerequisites

Before executing Wave 4 plans, ensure both secrets are in `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard → Project Settings → API → service_role key>
ADMIN_SECRET=<generate: openssl rand -hex 32>
```

**Verify:** `Get-Content .env.local` — confirm both keys are present before running P-07.

---

## Execution Order (Waves)

```
Wave 1  — P-01, P-02          (foundations — no deps)
Wave 2  — P-03                (import updates — needs Wave 1)
Wave 3  — P-04, P-05, P-06    (infrastructure — parallel OK)
Wave 4  — P-07, P-08, P-09, P-10b, P-10  (new files — needs P-04)
Wave 5  — P-11, P-12          (URL routing — needs Wave 2)
Wave 6  — P-13                (schema migration — independent, run last)
```

---

## Plans

### P-01 — Create `lib/types.ts` [Wave 1 / D-07]

**Goal:** Single source of truth for the `Liikuntapaikka` TypeScript type, with 4 optional forward-compat fields for Phase 3+ data.

**Files:**
- `lib/types.ts` — CREATE

**Steps:**
1. Create `lib/types.ts` with the `Liikuntapaikka` type extracted verbatim from `app/components/LiikuntapaikatLista.tsx` lines 12–25, plus 4 optional fields:
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
     // Phase 1 schema additions (DATA-04) — optional for forward compatibility
     hinta_kuvaus?: string | null
     aukioloajat?: Record<string, { open: string; close: string }> | null
     lajit_lista?: string[] | null
     featured?: boolean | null
   }
   ```
2. Run `npx tsc --noEmit` — expect 0 errors (new file has no dependents yet).

**Commit:** `feat(types): extract Liikuntapaikka type to lib/types.ts`

---

### P-02 — Add `hintateksti` to `lib/utils.ts` [Wave 1 / D-08]

**Goal:** Consolidate the three identical `hintateksti()` helper copies into one canonical export.

**Files:**
- `lib/utils.ts` — MODIFY (add export)

**Steps:**
1. Read `lib/utils.ts` (currently 6 lines — only `cn()`).
2. Append the `hintateksti` export after `cn()`:
   ```typescript
   export function hintateksti(min: number | null, max: number | null): string {
     if (min != null && max != null) return `${min}–${max} €`
     if (min != null) return `alkaen ${min} €`
     if (max != null) return `max ${max} €`
     return ''
   }
   ```
   (Source: `app/components/PaikkaKortti.tsx` lines 22–27 — identical across all 3 files.)
3. Run `npx tsc --noEmit` — expect 0 errors.

**Commit:** `feat(utils): add hintateksti helper to lib/utils.ts`

---

### P-03 — Update all component imports [Wave 2 / D-07a–d, D-08 consumers]

**Goal:** All components import `Liikuntapaikka` from `@/lib/types` and `hintateksti` from `@/lib/utils`. Remove local duplicates.

**Files:**
- `app/components/LiikuntapaikatLista.tsx` — MODIFY (replace type def with re-export)
- `app/components/PaikkaKortti.tsx` — MODIFY (type import + remove local hintateksti)
- `app/components/Etusivu.tsx` — MODIFY (type import + remove local hintateksti)
- `app/paikat/[id]/page.tsx` — MODIFY (remove local hintateksti, add import)

**Steps:**

**3a. `LiikuntapaikatLista.tsx`** — Replace type definition (lines 12–25) with re-export:
```typescript
// DELETE the entire Liikuntapaikka type block (lines 12–25)
// ADD this single line in its place:
export type { Liikuntapaikka } from '@/lib/types'
```
This is a non-breaking re-export — all existing imports from `./LiikuntapaikatLista` continue working.

**3b. `PaikkaKortti.tsx`** — Two changes:
- Line 6: Change `import type { Liikuntapaikka } from './LiikuntapaikatLista'` → `import type { Liikuntapaikka } from '@/lib/types'`
- Add `import { hintateksti } from '@/lib/utils'` to imports
- Delete local `hintateksti` function (lines 22–27)

**3c. `Etusivu.tsx`** — Two changes:
- Line 11: Change `import type { Liikuntapaikka } from './LiikuntapaikatLista'` → `import type { Liikuntapaikka } from '@/lib/types'`
- Add `import { hintateksti } from '@/lib/utils'` to imports
- Delete local `hintateksti` function (lines 42–47)

**3d. `app/paikat/[id]/page.tsx`** — One change:
- Delete local `hintateksti` function (lines 7–12)
- Add `import { hintateksti } from '@/lib/utils'` after existing imports
- No type import needed (uses `select('*')`, no `Liikuntapaikka` type)

**Verification:** Run `npx tsc --noEmit` — expect 0 errors. All existing `hintateksti` call sites at `Etusivu.tsx` lines 366–367 and `PaikkaKortti.tsx` and `paikat/[id]/page.tsx` continue to work.

**Commit:** `refactor: consolidate Liikuntapaikka type and hintateksti to lib/`

---

### P-04 — Add `supabaseAdmin` to `lib/supabase.ts` [Wave 3 / D-03a]

**Goal:** Provide a server-only admin Supabase client that bypasses RLS, for use in API route handlers only.

**Files:**
- `lib/supabase.ts` — MODIFY (add supabaseAdmin export)

**Steps:**
1. Read `lib/supabase.ts` (currently 6 lines).
2. Append after the `supabase` export:
   ```typescript
   // Server-only admin client — bypasses RLS. NEVER import in client components.
   // Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (no NEXT_PUBLIC_ prefix).
   export const supabaseAdmin = createClient(
     supabaseUrl,
     process.env.SUPABASE_SERVICE_ROLE_KEY!
   )
   ```
3. Run `npx tsc --noEmit` — expect 0 errors (the `!` non-null assertion is safe here; runtime validation happens in the route handlers that check `ADMIN_SECRET` configuration).

**Commit:** `feat(supabase): add supabaseAdmin server-only client`

---

### P-05 — Fix `lajiVari` in `Kartta.tsx` [Wave 3 / D-09]

**Goal:** Remove inline color map from `Kartta.tsx`; use `getInfoWindowStyle()` from `lib/lajit.ts` instead (CLAUDE.md: "Do not inline sport colors in components").

**Files:**
- `lib/lajit.ts` — MODIFY (add `getInfoWindowStyle` function)
- `app/components/Kartta.tsx` — MODIFY (remove `lajiVari`, update imports and InfoWindow)

**Steps:**

**5a. `lib/lajit.ts`** — Add after the `lajiKonfig` export (currently ends at line ~18):
```typescript
// Used by Kartta.tsx InfoWindow — renders outside React DOM, Tailwind classes don't apply there
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

**5b. `app/components/Kartta.tsx`** — Three changes:
- **Remove** `lajiVari` record (lines 9–15)
- **Update imports** (lines 1–5):
  - Change `import type { Liikuntapaikka } from './LiikuntapaikatLista'` → `import type { Liikuntapaikka } from '@/lib/types'`
  - Add `import { getInfoWindowStyle } from '@/lib/lajit'`
- **Update InfoWindow badge style** (lines 79–80) — replace:
  ```typescript
  // OLD:
  background: lajiVari[valittu.laji]?.bg ?? '#f3f4f6',
  color: lajiVari[valittu.laji]?.color ?? '#374151',
  // NEW:
  ...getInfoWindowStyle(valittu.laji),
  ```

**Verification:** Run `npx tsc --noEmit` — expect 0 errors.

**Commit:** `fix(kartta): replace inline lajiVari with getInfoWindowStyle from lib/lajit`

---

### P-06 — Remove unused packages [Wave 3 / D-10]

**Goal:** Remove `tw-animate-css` (Tailwind v4 incompatible) and `lucide-react` (unused) from `package.json`.

**Files:**
- `package.json` — MODIFY (automated via npm)
- `package-lock.json` — MODIFY (automated)

**Steps:**
1. Verify no imports before removing:
   ```powershell
   Select-String -Path "app/**","lib/**","components/**" -Pattern "lucide-react" -Recurse
   Select-String -Path "app/**","lib/**","components/**" -Pattern "tw-animate-css" -Recurse
   ```
   Expected: no results for either. If any results appear, investigate before proceeding.
2. Run: `npm uninstall lucide-react tw-animate-css`
3. Run `npm run build` to confirm build passes without these packages.

**Commit:** `chore: remove unused packages (lucide-react, tw-animate-css)`

---

### P-07 — Create admin sync route [Wave 4 / D-01 + D-02]

**Goal:** New `/api/admin/sync-paikat` route with Bearer auth guard and `supabaseAdmin` client — the safe, named-correctly admin data ingestion endpoint.

**Prerequisite:** `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_SECRET` must be in `.env.local`. Verify before starting this plan.

**Files:**
- `app/api/admin/sync-paikat/route.ts` — CREATE (new directory + file)

**Steps:**
1. Copy `app/api/hae-paikat/route.ts` as the base.
2. Make these 3 changes:
   - **Line 2:** Change `import { supabase } from '@/lib/supabase'` → `import { supabaseAdmin } from '@/lib/supabase'`
   - **Lines 57–58:** Change `export async function GET()` → `export async function GET(req: Request)` and insert auth guard as first statements:
     ```typescript
     export async function GET(req: Request) {
       if (!process.env.ADMIN_SECRET) {
         return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
       }
       if (req.headers.get('authorization') !== `Bearer ${process.env.ADMIN_SECRET}`) {
         return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
       }
       if (!API_KEY) { // existing check — keep
     ```
   - **Line 131 (upsert):** Change `supabase.from` → `supabaseAdmin.from`
3. Run `npx tsc --noEmit` — expect 0 errors.
4. Run dev server and test: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/admin/sync-paikat` → expect `401`
5. Test with valid header: `curl -H "Authorization: Bearer $ADMIN_SECRET" http://localhost:3000/api/admin/sync-paikat` → expect 200 with JSON (or 500 if GOOGLE_PLACES_API_KEY not set, which is expected in dev).

**Commit:** `feat(api): add /api/admin/sync-paikat with Bearer auth guard (SEC-01)`

---

### P-08 — Protect existing `/api/hae-paikat` route [Wave 4 / D-02b]

**Goal:** Add the same Bearer auth guard to the old route so no unauthenticated caller can drain Google Places quota during the transition period.

**Files:**
- `app/api/hae-paikat/route.ts` — MODIFY

**Steps:**
1. Change `export async function GET()` (line 57) → `export async function GET(req: Request)`
2. Insert auth guard as first statements (same pattern as P-07):
   ```typescript
   if (!process.env.ADMIN_SECRET) {
     return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
   }
   if (req.headers.get('authorization') !== `Bearer ${process.env.ADMIN_SECRET}`) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
   }
   ```
3. Also swap the upsert on line 131: `supabase.from` → `supabaseAdmin.from` (needed after RLS is enabled in P-13).
4. Add `supabaseAdmin` to the import: `import { supabase, supabaseAdmin } from '@/lib/supabase'`
5. Run `npx tsc --noEmit` — expect 0 errors.
6. Test: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/hae-paikat` → expect `401`

**Commit:** `fix(api): protect /api/hae-paikat with Bearer auth guard (SEC-01)`

---

### P-09 — Create `app/loading.tsx` skeleton [Wave 4 / D-11]

**Goal:** Show skeleton cards matching PaikkaKortti dimensions during SSR data fetch — prevents blank screen (SEC-04).

**Files:**
- `app/loading.tsx` — CREATE

**Steps:**
1. Create `app/loading.tsx` with NO `'use client'` directive (server component, no interactivity):
   ```tsx
   export default function Loading() {
     return (
       <div className="min-h-screen bg-indigo-50">
         <div className="bg-indigo-600 pb-16 relative">
           <div className="max-w-5xl mx-auto px-4 pt-10 pb-6 sm:pt-14 sm:pb-8">
             <div className="h-10 w-48 bg-indigo-500/50 rounded animate-pulse" />
             <div className="mt-2 h-4 w-32 bg-indigo-500/40 rounded animate-pulse" />
             <div className="mt-5 h-12 max-w-lg bg-indigo-500/40 rounded-full animate-pulse" />
           </div>
           <svg className="absolute bottom-0 left-0 w-full h-16" viewBox="0 0 1440 64" preserveAspectRatio="none">
             <path d="M0,32 C240,0 480,64 720,32 C960,0 1200,64 1440,32 L1440,64 L0,64 Z" fill="#EEF2FF" />
           </svg>
         </div>
         <div className="max-w-5xl mx-auto px-4 pt-9 pb-10">
           <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
             {Array.from({ length: 6 }).map((_, i) => (
               <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                 <div className="h-2 w-full bg-gray-200 animate-pulse" />
                 <div className="p-5 flex flex-col gap-3">
                   <div className="h-5 w-16 bg-gray-200 rounded-full animate-pulse" />
                   <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
                   <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse" />
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
2. Note: The wave divider SVG matches the pattern from CLAUDE.md hero section exactly (`fill="#EEF2FF"` = indigo-50).
3. Run `npm run build` — verify no errors with the new file.

**Commit:** `feat(ui): add app/loading.tsx skeleton cards (SEC-04)`

---

### P-10b — Create `app/not-found.tsx` 404 page [Wave 4 / SEC-04]

**Goal:** Show a branded Finnish 404 page when a user navigates to a non-existent route — satisfying the "broken route" half of SC-4 alongside `error.tsx`.

**Files:**
- `app/not-found.tsx` — CREATE

**Steps:**
1. Create `app/not-found.tsx` — no `'use client'` needed (server component, no interactivity or hooks):
   ```tsx
   import Link from 'next/link'

   export default function NotFound() {
     return (
       <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center px-4 pb-16">
         <div className="text-center max-w-sm">
           <p className="text-5xl mb-4 select-none">🔍</p>
           <h1 className="text-2xl font-bold text-indigo-950 mb-2">Sivua ei löydy.</h1>
           <p className="text-gray-500 mb-8">Etsimääsi sivua ei ole olemassa tai se on siirretty.</p>
           <Link
             href="/"
             className="inline-block bg-[#6366F1] hover:bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-full [transition:background-color_150ms_var(--ease-out)]"
           >
             Palaa etusivulle
           </Link>
         </div>
       </div>
     )
   }
   ```
2. No animation here — `not-found.tsx` is a server component so Framer Motion cannot be used. Static layout is correct.
3. Run `npm run build` — verify no errors.

**Commit:** `feat(ui): add app/not-found.tsx Finnish 404 page (SEC-04)`

---

### P-10 — Create `app/error.tsx` error boundary [Wave 4 / D-12]

**Goal:** Show a friendly Finnish error page with brand styling instead of Next.js stack trace (SEC-04).

**Files:**
- `app/error.tsx` — CREATE

**Steps:**
1. Create `app/error.tsx` — **must have `'use client'`** (Next.js App Router error boundaries are always client components):
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
2. Animation spec (CLAUDE.md): duration 0.35, ease `[0.25, 0.1, 0.25, 1]`, opacity + y:12→0 only.
3. Run `npm run build` — verify no errors.

**Commit:** `feat(ui): add app/error.tsx Finnish error boundary (SEC-04)`

---

### P-11 — Fix URL routing in `app/page.tsx` [Wave 5 / D-04 + D-05]

**Goal:** Canonical `?nakyma=` param scheme — `page.tsx` renders `LiikuntapaikatLista` for `lista` and `kartta`, `Etusivu` otherwise.

**Files:**
- `app/page.tsx` — MODIFY

**Steps:**
1. Read `app/page.tsx` to find exact current lines.
2. Change the `searchParams` type annotation:
   - Find: `searchParams: { view?: string; map?: string }` (or similar)
   - Replace with: `searchParams: { nakyma?: string }`
3. Change the routing condition:
   - Find: `if (searchParams.view === 'lista')` (or similar broken check)
   - Replace with:
     ```typescript
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
4. **Do not** add `await` to `searchParams` — this is Next.js 14, not 15. `searchParams` is a synchronous object here.
5. **Note on D-05 (nakyma prop):** D-05 mentions "pass nakyma as prop." This plan intentionally omits it — `LiikuntapaikatLista` already reads `?nakyma` via `useSearchParams()` client-side; passing it as a prop would create a hydration sync concern with no benefit. The routing condition in `page.tsx` satisfies the functional intent of D-05.
6. Run `npx tsc --noEmit` — expect 0 errors.

**Commit:** `fix(routing): use ?nakyma= canonical param in page.tsx (SEC-02)`

---

### P-12 — Fix `BottomNav.tsx` URL params and active state [Wave 5 / D-06]

**Goal:** BottomNav tabs write `?nakyma=kartta` / `?nakyma=lista` and correctly highlight the active tab.

**Files:**
- `app/components/BottomNav.tsx` — MODIFY

**Steps:**
1. Read `app/components/BottomNav.tsx` to find exact current lines.
2. **Delete** the `view` and `map` variable reads (currently lines 65–66):
   ```typescript
   // DELETE:
   const view = searchParams.get('view')
   const map  = searchParams.get('map')
   ```
3. **Replace** the `isKoti / isKartta / isLista` booleans (lines 68–71):
   ```typescript
   // NEW:
   const nakyma = searchParams.get('nakyma')
   const isKoti     = pathname === '/' && !nakyma
   const isKartta   = pathname === '/' && nakyma === 'kartta'
   const isLista    = pathname === '/' && nakyma === 'lista'
   const isSuosikit = pathname === '/suosikit'
   ```
4. **Fix hrefs** — find and replace:
   - `href="/?map=1"` → `href="/?nakyma=kartta"`
   - `href="/?view=lista"` → `href="/?nakyma=lista"`
5. **Do not touch** the `<Suspense>` wrapper in `app/layout.tsx` — it must stay to support `useSearchParams()`.
6. Run `npx tsc --noEmit` — expect 0 errors.
7. Manual test: open `http://localhost:3000/?nakyma=kartta` — Kartta tab in BottomNav should be active (indigo text). Navigate between tabs and verify URL updates correctly.

**Commit:** `fix(routing): update BottomNav to use ?nakyma= param (SEC-02)`

---

### P-13 — Schema migration and RLS [Wave 6 / D-13 + D-14 + D-03b]

**Goal:** Add 4 columns to `liikuntapaikat` table and enable RLS — schema ready for all v1 phases, anon key is read-only.

**Prerequisite:** P-07 and P-08 must be complete and deployed (or dev server tested) so that upsert routes use `supabaseAdmin` before RLS blocks anon writes.

**Files:**
- `supabase/migrations/20260519000000_add_phase1_columns.sql` — CREATE
- `supabase/migrations/20260519000001_enable_rls.sql` — CREATE

**Steps:**

**13a. Create migration directory and column migration file:**
```sql
-- supabase/migrations/20260519000000_add_phase1_columns.sql
-- Phase 1: Foundation & Security (DATA-04, ADS-01)

ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS hinta_kuvaus text;

ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS aukioloajat jsonb;

ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS lajit_lista jsonb;

ALTER TABLE liikuntapaikat
  ADD COLUMN IF NOT EXISTS featured boolean DEFAULT false;
```

**13b. Create RLS migration file:**
```sql
-- supabase/migrations/20260519000001_enable_rls.sql
-- Phase 1: Foundation & Security (SEC-03)

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

**13c. Run in Supabase:**
- Go to Supabase dashboard → SQL Editor
- Run `20260519000000_add_phase1_columns.sql` first (idempotent — safe to re-run)
- Run `20260519000001_enable_rls.sql` second
- **Check first:** If RLS is already enabled on the table, skip `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and only run the `CREATE POLICY` statements.

**13d. Verify in Supabase SQL Editor:**
```sql
-- Verify columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'liikuntapaikat'
  AND column_name IN ('hinta_kuvaus','aukioloajat','lajit_lista','featured');
-- Expected: 4 rows

-- Verify existing rows are unaffected
SELECT id, nimi, hinta_kuvaus, featured FROM liikuntapaikat LIMIT 3;
-- Expected: hinta_kuvaus = NULL, featured = false, no errors

-- Verify RLS blocks anon writes (run in browser console with anon key):
-- const { error } = await supabase.from('liikuntapaikat').insert({ nimi: 'test' })
-- Expected: error.code === '42501' or similar RLS rejection
```

**Commit:** `feat(db): add Phase 1 schema columns and enable RLS (DATA-04, SEC-03)`

---

## Phase Verification

Run these checks after all 13 plans are complete:

### Success Criterion 1 — SEC-01: `/api/hae-paikat` returns 401 without auth
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/hae-paikat" -UseBasicParsing | Select-Object StatusCode
# Expected: 401
Invoke-WebRequest -Uri "http://localhost:3000/api/admin/sync-paikat" -UseBasicParsing | Select-Object StatusCode
# Expected: 401
```

### Success Criterion 2 — SEC-02: URL routing works everywhere
- Open `http://localhost:3000/?nakyma=kartta` → map view loads, no console error, Kartta tab highlighted
- Open `http://localhost:3000/?nakyma=lista` → list view loads, Lista tab highlighted
- Click BottomNav Kartta tab → URL changes to `?nakyma=kartta`
- Open `http://localhost:3000/` → Etusivu renders

### Success Criterion 3 — SEC-03: RLS blocks anon writes
In browser console (after RLS migration):
```javascript
const { createClient } = supabase // or paste key from .env.local
const { error } = await supabase.from('liikuntapaikat').insert({ nimi: 'rls-test' })
// Expected: error !== null (RLS rejection)
```

### Success Criterion 4 — SEC-04: Error/loading pages are Finnish and branded
- Throttle network in DevTools → reload → skeleton cards appear (no blank screen)
- Trigger error manually or test by temporarily throwing in `app/page.tsx` → error page with "Jotain meni pieleen." and indigo brand
- Navigate to `http://localhost:3000/tata-sivua-ei-ole` → Finnish 404 page "Sivua ei löydy." with indigo brand

### Success Criterion 5 — DATA-04 + ADS-01: Schema columns exist
In Supabase SQL Editor:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'liikuntapaikat'
  AND column_name IN ('hinta_kuvaus','aukioloajat','lajit_lista','featured');
-- Expected: 4 rows returned
```

### Build gate
```powershell
npm run build
# Expected: exit 0, no TypeScript errors, no import errors
```

---

## Risk Notes

1. **`SUPABASE_SERVICE_ROLE_KEY` not in `.env.local`** — check before starting Wave 4. Get from Supabase dashboard → Project Settings → API → service_role key.
2. **RLS timing** — run P-13 AFTER P-07 and P-08 are verified working. If RLS is enabled before routes use `supabaseAdmin`, upserts will fail with 403/42501.
3. **Pitfall: Next.js 14 vs 15 `searchParams`** — do NOT add `await` to `searchParams` in `page.tsx`. This is Next.js 14 where `searchParams` is synchronous.
4. **Pitfall: `lajiKonfig.badgeTw` in inline styles** — cannot use Tailwind class strings in `style={{ background: ... }}`. The `getInfoWindowStyle()` helper returns hex values for exactly this reason.
