# Phase 1: Foundation & Security - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix 3 critical bugs (unprotected API, broken URL routing, no RLS), add error/loading UI, run Supabase schema migration, and clean up code prerequisites — so all subsequent phases build on a safe, consistent foundation.

Delivers: SEC-01, SEC-02, SEC-03, SEC-04, DATA-04, ADS-01
</domain>

<decisions>
## Implementation Decisions

### Supabase RLS + Write Access
- **D-01:** Create a new `/api/admin/sync-paikat` route that uses `SUPABASE_SERVICE_ROLE_KEY` (server-only env var) for all Supabase writes. The old `/api/hae-paikat` can be repurposed or kept as-is but protected.
- **D-02:** Protect the admin route with `Authorization: Bearer ${ADMIN_SECRET}` header check — reject with 401 before any processing if header is absent or wrong.
- **D-03:** RLS policy: `SELECT` for all (anon key reads work), `INSERT/UPDATE/DELETE` only for authenticated users — leaves the door open for future auth without breaking public reads.

### URL Routing
- **D-04:** Canonical URL scheme: `/` → Etusivu, `/?nakyma=lista` → LiikuntapaikatLista in list mode, `/?nakyma=kartta` → LiikuntapaikatLista in map mode.
- **D-05:** `page.tsx` routing logic: `nakyma === 'lista' || nakyma === 'kartta'` → render LiikuntapaikatLista (pass nakyma as prop), otherwise → render Etusivu.
- **D-06:** Files to update: `app/page.tsx`, `app/components/BottomNav.tsx` (replace `?map=1` with `?nakyma=kartta`, replace `?view=lista` with `?nakyma=lista`), `app/components/LiikuntapaikatLista.tsx` (already uses `?nakyma=kartta` internally — verify consistency).

### Code Cleanup (Phase 1 scope)
- **D-07:** Move `Liikuntapaikka` TypeScript type from `LiikuntapaikatLista.tsx` to `lib/types.ts` — all components import from there.
- **D-08:** Consolidate `hintateksti()` helper from 3 copy-paste locations into `lib/utils.ts` — required before DATA-04 adds `hinta_kuvaus` field.
- **D-09:** Fix `lajiVari` in `Kartta.tsx` — replace inline color map with lookup from `lajiKonfig` in `lib/lajit.ts` (CLAUDE.md requirement: "Do not inline sport colors in components").
- **D-10:** Remove `tw-animate-css` and `lucide-react` from `package.json` — both unused, `tw-animate-css` incompatible with Tailwind v3.

### Error & Loading UI
- **D-11:** `app/loading.tsx` — skeleton cards matching the PaikkaKortti dimensions. Reduces layout shift when data arrives.
- **D-12:** `app/error.tsx` — animated error message using indigo brand colors, small entrance animation (CLAUDE.md animation principles), Finnish text: "Jotain meni pieleen." with "Yritä uudelleen" button and "Palaa etusivulle" link.

### Schema Migration (DATA-04)
- **D-13:** Add 4 columns to `liikuntapaikat` table: `hinta_kuvaus text`, `aukioloajat jsonb`, `lajit_lista jsonb`, `featured boolean DEFAULT false`. Existing rows must not break (nullable or with defaults).
- **D-14:** Commit migration SQL to `supabase/migrations/` so schema is tracked in git.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/ROADMAP.md` — Phase 1 goal and success criteria (5 criteria)
- `.planning/REQUIREMENTS.md` — SEC-01–04, DATA-04, ADS-01 with REQ-IDs

### Security & Architecture
- `.planning/codebase/CONCERNS.md` — All HIGH/MEDIUM security and tech debt issues with file:line references
- `.planning/research/PITFALLS.md` — Pitfalls C-1 (unauthenticated API), C-4 (URL routing), M-5 (Supabase RLS) with prevention strategies

### Design Constraints
- `CLAUDE.md` — Color system, animation principles, component conventions (lajiKonfig rule, Tailwind v3 note)

### Files to Change
- `app/api/hae-paikat/route.ts` — Basis for new admin route; understand current structure
- `app/components/BottomNav.tsx` — URL params to fix (`?map=1` → `?nakyma=kartta`, `?view=lista` → `?nakyma=lista`)
- `app/page.tsx` — Routing logic to update
- `app/components/LiikuntapaikatLista.tsx` — Standardize nakyma param, Liikuntapaikka type import
- `app/components/Kartta.tsx` — Fix lajiVari → lajiKonfig
- `lib/utils.ts` — Target for hintateksti consolidation
- `lib/lajit.ts` — Source of truth for sport colors (lajiKonfig)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/lajit.ts`: `lajiKonfig` map — use for sport colors in Kartta.tsx fix
- `lib/utils.ts`: `cn()` helper exists — add `hintateksti()` here
- `app/components/PaikkaKortti.tsx`: existing skeleton pattern reference for loading.tsx

### Established Patterns
- Server components in `app/page.tsx` fetch Supabase, pass data as props to client components
- All client components use `'use client'` + Framer Motion for animations
- URL state via `useSearchParams` + `useRouter` — no external state library
- Indigo color system strictly from CLAUDE.md tokens

### Integration Points
- `lib/supabase.ts`: add a `supabaseAdmin` export using `SUPABASE_SERVICE_ROLE_KEY` alongside existing anon client
- `app/layout.tsx`: `app/error.tsx` and `app/loading.tsx` are picked up automatically by Next.js App Router
- `supabase/migrations/`: create directory + initial migration file

</code_context>

<specifics>
## Specific Ideas

- Error page: indigo brand colors + small entrance animation — matches Wolt/Ryde reference feel
- Loading: skeleton cards (not spinner) — reduces layout shift, matches PaikkaKortti dimensions
- Admin route protection: simple Bearer token check as first line — `if (req.headers.get('authorization') !== \`Bearer ${process.env.ADMIN_SECRET}\`) return 401`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 1-Foundation-and-Security*
*Context gathered: 2026-05-19*
