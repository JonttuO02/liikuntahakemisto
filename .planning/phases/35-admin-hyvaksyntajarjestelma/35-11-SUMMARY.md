---
phase: 35-admin-hyvaksyntajarjestelma
plan: 11
subsystem: api
tags: [nextjs, supabase, jwt, business, reapply, route-handler]

# Dependency graph
requires:
  - phase: 35-admin-hyvaksyntajarjestelma
    provides: business_paikka_links schema with claim_status + rejection_reason columns
  - phase: 35-admin-hyvaksyntajarjestelma
    provides: POST /api/business/claim-paikka JWT auth pattern and sendAdminNotificationEmail usage
provides:
  - POST /api/business/reapply — finds rejected business_paikka_links row, UPDATEs to pending
  - Hae uudelleen button in /business wired to reapply API with optimistic state update
affects: [35-admin-hyvaksyntajarjestelma, 36-hallintapaneeli]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Reapply pattern: UPDATE existing rejected row instead of INSERT new row (avoids 409 unique constraint)"
    - "Optimistic UI update: setVenueLinks(prev => prev.map(...)) after successful API call"

key-files:
  created:
    - app/api/business/reapply/route.ts
  modified:
    - app/business/page.tsx

key-decisions:
  - "Reapply uses UPDATE not INSERT — fixes GAP B from 35-UAT.md (409 unique constraint violation)"
  - "Admin notification email reused from claim-paikka pattern, non-critical (try/catch)"
  - "Button handler is inline async function — no new state variables added"

patterns-established:
  - "UPDATE-not-INSERT for reapply pattern: find by (business_account_id, paikka_id, claim_status='rejected'), then UPDATE id"

requirements-completed: [ADMIN-03]

# Metrics
duration: 10min
completed: 2026-06-10
---

# Phase 35 Plan 11: Reapply Route Summary

**POST /api/business/reapply updates rejected business_paikka_links row to pending via JWT-authenticated UPDATE, fixing GAP B 409 unique constraint error on reapply**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-10T15:52:00Z
- **Completed:** 2026-06-10T16:02:05Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created POST /api/business/reapply route that finds rejected link row and UPDATEs claim_status to pending
- Wired "Hae uudelleen" button to call the new API instead of opening ClaimSearchForm
- Optimistic UI update: venue badge changes from rejected (red) to pending (amber) without page reload

## Task Commits

Each task was committed atomically:

1. **Task 1: Create app/api/business/reapply/route.ts** - `5ea2f56` (feat)
2. **Task 2: Update business/page.tsx — Hae uudelleen button calls /api/business/reapply** - `e644c36` (feat)

**Plan metadata:** (docs commit to follow)

## Files Created/Modified
- `app/api/business/reapply/route.ts` - New POST route: JWT auth, find rejected row, UPDATE to pending, send admin notification
- `app/business/page.tsx` - Hae uudelleen button onClick replaced with async reapply handler

## Decisions Made
- UPDATE-not-INSERT: the reapply endpoint uses `.update()` on the existing rejected row rather than `.insert()`, eliminating the 409 UNIQUE constraint violation that was the root cause of GAP B
- Admin notification email reuses the same try/catch non-critical pattern from claim-paikka; uses `rejectedLink.id` (the existing row id) as applicationId
- No new state variables introduced: handler is an inline async arrow function reading existing setVenueLinks setter

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript errors in app/admin/[id]/page.tsx and app/admin/page.tsx (from plans 35-08 and 35-09). These are unrelated to this plan's changes — files modified in this plan compile without TypeScript errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- GAP B from 35-UAT.md is closed. Reapply flow works correctly via UPDATE instead of INSERT.
- Phase 35 now has all gap-closure plans complete (35-10: logo_url, 35-11: reapply).
- Ready for /gsd:verify-work 35 to confirm all UAT items are resolved.

---
*Phase: 35-admin-hyvaksyntajarjestelma*
*Completed: 2026-06-10*
