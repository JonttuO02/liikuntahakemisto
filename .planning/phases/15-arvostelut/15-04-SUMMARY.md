---
phase: 15-arvostelut
plan: "04"
subsystem: frontend-integration
tags: [react, next.js, supabase, reviews, server-component, ssr]

requires:
  - phase: 15-arvostelut
    plan: "01"
    provides: lib/reviewUtils.ts (computeAvgRating), reviews table with RLS
  - phase: 15-arvostelut
    plan: "02"
    provides: app/components/ReviewSection.tsx (ReviewRow type, default export)
  - phase: 15-arvostelut
    plan: "03"
    provides: app/components/ReviewForm.tsx (auth-gated upsert form)

provides:
  - app/paikat/[id]/page.tsx: Server-side reviews fetch + ReviewSection mount — completes Phase 15 feature integration

affects:
  - 15-verify: page.tsx integration is the final wiring step; human verification (Task 2) closes Phase 15

tech-stack:
  added: []
  patterns:
    - "Server component reviews fetch: createServerSupabase(cookies()).from('reviews').select(6 public columns).eq('paikka_id', id).order('created_at', ascending: false)"
    - "T-15-02: user_id excluded from SELECT — enforced via verify script regex guard"
    - "computeAvgRating from reviewUtils as single source of truth for average — no inline reduce"
    - "ReviewSection placed after outer content card wrapper — no additional wrapper added (ReviewSection owns its own max-w-2xl padding)"

key-files:
  created: []
  modified:
    - app/paikat/[id]/page.tsx

key-decisions:
  - "ReviewSection rendered AFTER the outer max-w-2xl wrapper closes to minimise diff churn (ReviewSection owns its own max-w-2xl mx-auto px-4 pb-10)"
  - "reviews SELECT lists exactly 6 public columns — user_id intentionally omitted per T-15-02"
  - "computeAvgRating used instead of inline reduce — reviewUtils is the single source of truth per plan"

requirements-completed: [REVIEW-01, REVIEW-02, REVIEW-03, REVIEW-04]

duration: 8min
completed: 2026-05-28
---

# Phase 15 Plan 04: ReviewSection Integration Summary

**Server-side reviews fetch wired into app/paikat/[id]/page.tsx — 6-column SELECT (no user_id), computeAvgRating helper, ReviewSection mounted after the content card — verify script OK, tsc clean, 63 tests green**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-05-28
- **Completed:** 2026-05-28
- **Tasks:** 1/1 complete (Task 2 is a human-verify checkpoint)
- **Files modified:** 1

## Accomplishments

- `app/paikat/[id]/page.tsx` modified with three localized edits:
  - Edit 1: imports — `ReviewSection` from `@/app/components/ReviewSection` and `computeAvgRating` from `@/lib/reviewUtils`
  - Edit 2: reviews query — `from('reviews').select('id, rating, teksti, is_anonymous, reviewer_name, created_at').eq('paikka_id', id).order('created_at', { ascending: false })` + `reviewList = reviewsData ?? []` + `avgRating = computeAvgRating(reviewList.map(r => r.rating))`
  - Edit 3: JSX insertion — `<ReviewSection paikkaId={id} initialReviews={reviewList} avgRating={avgRating} reviewCount={reviewList.length} />` after the outer content wrapper
- T-15-02 mitigated: `user_id` excluded from SELECT; verify script regex blocks future accidental inclusion
- Verify script exits 0 and prints OK
- `npx tsc --noEmit` exits 0
- `npx vitest run` 63/63 passing

## Task Commits

1. **Task 1: Wire ReviewSection into app/paikat/[id]/page.tsx** - `8223833` (feat)

## Files Created/Modified

- `app/paikat/[id]/page.tsx` — Added reviews fetch query, computeAvgRating call, and ReviewSection render

## Decisions Made

- ReviewSection placed after the outer `max-w-2xl mx-auto px-4 pt-6 pb-10` wrapper (not inside it) to minimise diff churn — ReviewSection owns its own layout wrapper per Plan 02
- `user_id` intentionally omitted from SELECT list — enforces T-15-02 at the data layer, not just at render time

## Deviations from Plan

None — plan executed exactly as written. All must-have truth statements satisfied, verify script OK, tsc clean, vitest green.

## Known Stubs

None — ReviewSection is fully wired with live server-fetched data.

## Threat Flags

No new threat surface beyond the plan's threat model.

- T-15-02 reinforced: reviews SELECT explicitly lists only public columns; verify script has a regex guard that fails the build if `user_id` appears in the reviews query

## Self-Check: PASSED

- `app/paikat/[id]/page.tsx` exists and contains all required strings: FOUND
- Commit `8223833`: FOUND
- Verify script: OK
- `npx tsc --noEmit`: 0 errors
- `npx vitest run`: 63/63 passing

---
*Phase: 15-arvostelut*
*Completed: 2026-05-28*
