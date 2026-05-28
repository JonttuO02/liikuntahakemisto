---
phase: 15-arvostelut
plan: "01"
subsystem: database
tags: [supabase, rls, vitest, tdd, reviews, sql, migration]

requires:
  - phase: 14-profiilisivu
    provides: profiles table pattern (bigserial PK, RLS SELECT/INSERT/UPDATE), supabaseSSR patterns

provides:
  - lib/reviewUtils.ts pure helpers: resolveDisplayName (anonymous name resolution, T-15-02), computeAvgRating (raw average for D-05 render-time rounding)
  - lib/reviewUtils.test.ts Vitest suite: 9 test cases (5 resolveDisplayName + 4 computeAvgRating), all green
  - supabase/migrations/20260528_reviews.sql reviews table DDL + RLS (SELECT USING(true), INSERT/UPDATE WITH CHECK auth.uid()=user_id, no DELETE)

affects:
  - 15-02 (ReviewSection imports resolveDisplayName and computeAvgRating from lib/reviewUtils.ts)
  - 15-03 (ReviewForm upserts to reviews table; onConflict: user_id,paikka_id)
  - 15-04 (page.tsx server query reads from reviews table)

tech-stack:
  added: []
  patterns:
    - "TDD RED/GREEN cycle: failing test committed first, then implementation"
    - "Pure helper module: no framework imports, JSDoc with edge case documentation"
    - "SQL migration follows suosikit.sql + profiles.sql patterns: bigserial PK, UNIQUE composite, RLS SELECT/INSERT/UPDATE"

key-files:
  created:
    - lib/reviewUtils.ts
    - lib/reviewUtils.test.ts
    - supabase/migrations/20260528_reviews.sql
  modified: []

key-decisions:
  - "resolveDisplayName returns 'Anonyymi' when isAnonymous=true or name is null/empty — T-15-02 anonymous identity protection"
  - "computeAvgRating returns raw average without rounding — rounding deferred to render time per D-05"
  - "reviews SELECT policy uses USING(true) — public read by design (REVIEW-04); differs from profiles/suosikit private-read pattern"
  - "No FOR DELETE policy — v1.2 has no delete-review capability"
  - "reviewer_name text nullable column stores email prefix at write time — never exposes user_id or full email in public reads"

patterns-established:
  - "Pure function file layout: JSDoc with inputs/outputs/edge cases + single export responsibility + no framework imports"
  - "SQL migration: comment header citing analogs + bigserial PK + composite UNIQUE + RLS enable + three named policies"

requirements-completed:
  - REVIEW-01
  - REVIEW-02
  - REVIEW-03
  - REVIEW-04

duration: 2min
completed: 2026-05-28
---

# Phase 15 Plan 01: Arvostelut Foundation Summary

**Pure `resolveDisplayName`/`computeAvgRating` helpers (TDD, 9 tests green) + `reviews` table migration with RLS for public read and user-owned write**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-05-28T19:32:06Z
- **Completed:** 2026-05-28T19:33:53Z
- **Tasks:** 2 auto-completed (Task 3 is a blocking human checkpoint)
- **Files modified:** 3

## Accomplishments

- TDD RED/GREEN cycle: failing test committed first (`2556df3`), implementation committed after (`c82e4d6`) — gate sequence validated
- `lib/reviewUtils.ts` exports two pure helpers with JSDoc and no framework imports — framework-agnostic, safe for server and client contexts
- `supabase/migrations/20260528_reviews.sql` defines reviews table with 12 columns, composite UNIQUE constraint, and three RLS policies — verifies OK against automated check script
- Full vitest suite (63 tests across 7 test files) remains green after adding 9 new cases

## Task Commits

1. **Task 1 RED: add failing reviewUtils unit tests** - `2556df3` (test)
2. **Task 1 GREEN: implement reviewUtils helpers** - `c82e4d6` (feat)
3. **Task 2: create reviews migration SQL** - `834ab3f` (feat)

## TDD Gate Compliance

- RED gate: `2556df3` — `test(15-01): add failing reviewUtils unit tests`
- GREEN gate: `c82e4d6` — `feat(15-01): implement reviewUtils helpers`
- REFACTOR gate: skipped (two short helpers with no shared logic)

## Files Created/Modified

- `/lib/reviewUtils.ts` — Pure helpers: `resolveDisplayName` (anonymous identity protection) + `computeAvgRating` (raw average, caller rounds)
- `/lib/reviewUtils.test.ts` — Vitest suite: 5 resolveDisplayName cases + 4 computeAvgRating cases, 9/9 passing
- `/supabase/migrations/20260528_reviews.sql` — CREATE TABLE reviews + ALTER TABLE ENABLE ROW LEVEL SECURITY + 3 named RLS policies

## Decisions Made

- `resolveDisplayName` returns `'Anonyymi'` even for empty string — empty string treated identically to null/undefined to prevent accidental identity disclosure (T-15-02 defense in depth)
- Rounding omitted from `computeAvgRating` — callers (ReviewSection render, D-05 format) receive raw float and round at display time, keeping the helper testable with exact equality
- Reviews SELECT policy uses `USING (true)` — explicitly differs from profiles/suosikit private-read pattern; reviews are world-readable per REVIEW-04
- Migration filename: `20260528_reviews.sql` (no HHMMSS suffix) — matches `files_modified` frontmatter exactly

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed SQL column alignment causing verification failure**
- **Found during:** Task 2 (migration verification)
- **Issue:** Column definitions used extra whitespace for alignment (e.g., `user_id      uuid NOT NULL`) which caused the exact-string verification script to fail matching `user_id uuid NOT NULL`
- **Fix:** Rewrote migration with single-space column definitions (no alignment padding)
- **Files modified:** supabase/migrations/20260528_reviews.sql
- **Verification:** Automated verify script printed `OK`
- **Committed in:** `834ab3f` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug in SQL formatting vs. verification script expectations)
**Impact on plan:** Minor formatting correction. Migration content unchanged — same schema, same RLS policies.

## Issues Encountered

None — both tasks executed cleanly after the SQL alignment fix.

## Known Stubs

None — lib/reviewUtils.ts and the migration SQL are complete. No placeholder values or TODO comments.

## Threat Flags

No new threat surface beyond the plan's threat model. The three RLS policies in the migration directly address T-15-01 (INSERT/UPDATE ownership) and T-15-02 (SELECT public read, reviewer_name column for anonymous display).

## Next Phase Readiness

- **Plans 02–04** can now import `resolveDisplayName` and `computeAvgRating` from `@/lib/reviewUtils`
- **Task 3 (blocking checkpoint):** Human must apply `supabase/migrations/20260528_reviews.sql` to the live Supabase project and confirm `select count(*) from reviews;` returns 0 — Plans 02–04 will fail at runtime without this schema push

---
*Phase: 15-arvostelut*
*Completed: 2026-05-28*
