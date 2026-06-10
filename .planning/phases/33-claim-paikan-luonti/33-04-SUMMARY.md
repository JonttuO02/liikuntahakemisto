---
phase: 33-claim-paikan-luonti
plan: "04"
subsystem: database
tags: [supabase, published-filter, rls, homepage-query]

# Dependency graph
requires:
  - phase: 33-01
    provides: DB migration adding published column to liikuntapaikat with DEFAULT true
provides:
  - "Homepage query (app/page.tsx) filters published=false venues — business-created venues invisible until admin approval"
affects:
  - 33-05
  - 35-admin-hyvaksyntajarjestelma

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supabase query-level published filter: .eq('published', true) before .order()"

key-files:
  created: []
  modified:
    - app/page.tsx

key-decisions:
  - "published filter applied at query level in app/page.tsx (anon client) — not via RLS — because the anon key is read-only and RLS already restricts writes; adding filter at query level is simpler and explicit"
  - "app/api/hae-paikat/route.ts requires no change — it is admin-only (ADMIN_SECRET guard) and performs only upsert, no user-facing SELECT"

patterns-established:
  - "published=false venues are invisible to regular users via .eq('published', true) on the homepage query"

requirements-completed:
  - CLAIM-03

# Metrics
duration: 5min
completed: 2026-06-05
---

# Phase 33 Plan 04: Published Filter for Homepage Query Summary

**Single-line .eq('published', true) added to Supabase query in app/page.tsx, hiding business-created venues (published=false) from users until admin approval**

## Performance

- **Duration:** 5 min
- **Started:** 2026-06-05T16:05:00Z
- **Completed:** 2026-06-05T16:10:00Z
- **Tasks:** 2 (1 code change + 1 verification)
- **Files modified:** 1

## Accomplishments
- `.eq('published', true)` added to homepage Supabase query chain — published=false venues now invisible to regular users
- Confirmed `app/api/hae-paikat/route.ts` requires no change: it is protected by ADMIN_SECRET and performs only upsert operations (no user-facing SELECT)
- TypeScript compilation passes with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add .eq('published', true) filter to app/page.tsx** - `3df20f7` (feat)
2. **Task 2: Verify app/api/hae-paikat/route.ts per D-09** - no code change needed, verified admin-only upsert route

## Files Created/Modified
- `app/page.tsx` - Added `.eq('published', true)` between `.select(...)` and `.order('nimi')` in the homepage Supabase query

## Decisions Made
- Query-level filter in `app/page.tsx` is the correct approach: explicit, readable, and sufficient since the anon client has no bypass path through RLS
- `app/api/hae-paikat/route.ts` is admin-only (ADMIN_SECRET + supabaseAdmin) and only performs upsert — D-09's user-visibility requirement is fully satisfied by the `app/page.tsx` change alone

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CLAIM-03 filter is live: business-created venues with published=false will not appear on the homepage
- Phase 35 (admin approval system) can rely on this filter being in place when toggling published=true for approved venues

---
*Phase: 33-claim-paikan-luonti*
*Completed: 2026-06-05*
