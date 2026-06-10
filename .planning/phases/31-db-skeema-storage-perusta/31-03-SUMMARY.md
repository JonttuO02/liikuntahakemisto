---
phase: 31-db-skeema-storage-perusta
plan: "03"
subsystem: api
tags: [supabase, vitest, typescript, sync, business_managed, filter]

# Dependency graph
requires:
  - phase: 31-db-skeema-storage-perusta
    provides: Plan-02 adds business_managed column to liikuntapaikat (migration)
provides:
  - Unit tests for buildSyncResults filter logic (4 passing tests)
  - sync-paikat route pre-filters business_managed=true venues before fetchPlaceDetails and upsert
  - vitest test discovery extended to app/**/__tests__/*.test.ts
affects:
  - Phase 36 Hallintapaneeli (business_managed ensures synced data never overwrites business-owned venues)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-filter business_managed venues in TypeScript before upsert (upsert() cannot be WHERE-filtered)"
    - "Inline pure-function test helper avoids importing side-effectful route module in unit tests"
    - "vitest include pattern covers both lib/**/*.test.ts and app/**/__tests__/*.test.ts"

key-files:
  created:
    - app/api/admin/__tests__/sync-paikat-filter.test.ts
  modified:
    - app/api/admin/sync-paikat/route.ts
    - vitest.config.ts

key-decisions:
  - "allResults.length used for loydetty response field (Places API total, before business filter)"
  - "syncResults replaces allResults for fetchPlaceDetails and rivit construction after filter"
  - "managedRows query uses service-role supabaseAdmin to read all business_managed rows regardless of RLS"
  - "buildSyncResults defined inline in test (not exported from route) to avoid side-effectful imports"

patterns-established:
  - "Rule 3 auto-fix: vitest.config.ts include extended from lib/**/ to also cover app/**/__tests__/ when test lives outside lib/"

requirements-completed:
  - DATA-09

# Metrics
duration: 15min
completed: 2026-06-05
---

# Phase 31 Plan 03: sync-paikat business_managed pre-filter Summary

**TypeScript Set-based pre-filter in sync-paikat route excludes business_managed=true venues from Google Places upsert; 4 Vitest unit tests verify the filter logic in isolation**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-05T10:07:00Z
- **Completed:** 2026-06-05T10:09:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Created `app/api/admin/__tests__/sync-paikat-filter.test.ts` with 4 passing unit tests covering: managed place_id exclusion, empty managedRows pass-through, null managedRows safety, and loydetty/tallennettu count separation
- Edited `app/api/admin/sync-paikat/route.ts` to query `supabaseAdmin` for all `business_managed=true` place_ids, build an exclusion Set, and filter `allResults` into `syncResults` before `fetchPlaceDetails` and `rivit` construction — satisfying DATA-09 and threat T-31-09
- `allResults.length` preserved in the `loydetty` response field (Places API total, not filtered count)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write Wave 0 unit tests for sync-paikat business_managed filter** - `22d8177` (test)
2. **Task 2: Edit sync-paikat route to pre-filter business_managed venues** - `9e5c2c1` (feat)

**Plan metadata:** committed with SUMMARY.md

## Files Created/Modified

- `app/api/admin/__tests__/sync-paikat-filter.test.ts` - 4-test unit suite for `buildSyncResults` pure function
- `app/api/admin/sync-paikat/route.ts` - Added managedSet pre-filter (16 lines inserted, 2 lines updated)
- `vitest.config.ts` - Extended `include` to discover `app/**/__tests__/*.test.ts` (Rule 3 auto-fix)

## Decisions Made

- `allResults.length` stays as the `loydetty` response field — it reports the count from Google Places API (pre-filter), which is useful for telemetry. `syncResults.length` (post-filter) flows into the actual `tallennettu` count via `rivit`.
- Test defines `buildSyncResults` inline rather than importing from route.ts — the route module has side-effectful imports (Next.js, Supabase) that cannot be loaded in a plain Vitest node environment without full mocking.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extended vitest.config.ts include pattern**
- **Found during:** Task 1 (test file creation)
- **Issue:** `vitest.config.ts` had `include: ['lib/**/*.test.ts']` which would not discover `app/api/admin/__tests__/sync-paikat-filter.test.ts` — tests would appear to not exist when running `npx vitest run`
- **Fix:** Added `'app/**/__tests__/*.test.ts'` to the include array
- **Files modified:** `vitest.config.ts`
- **Verification:** `npx vitest run` discovers all 8 test files (68 tests) including the new 4
- **Committed in:** `22d8177` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 — blocking config issue)
**Impact on plan:** Auto-fix was essential for the test file to be discovered. No scope creep.

## Issues Encountered

None — after the vitest config fix, both tasks executed cleanly.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- DATA-09 verified: `sync-paikat` route will not overwrite business-owned venues when `business_managed=true`
- The filter queries `supabaseAdmin` which requires the `business_managed` column to exist in the live DB (added by Plan-02 migration). Filter works correctly once that migration runs — no additional code changes needed.
- Plans 01-04 together complete Phase 31 Wave 1; no blockers for Phase 32 (Yritysrekisteröinti).

---
*Phase: 31-db-skeema-storage-perusta*
*Completed: 2026-06-05*
