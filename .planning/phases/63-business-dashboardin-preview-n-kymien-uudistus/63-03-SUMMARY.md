---
phase: 63-business-dashboardin-preview-n-kymien-uudistus
plan: 03
subsystem: api
tags: [supabase, vitest, business-dashboard, claim-status]

# Dependency graph
requires:
  - phase: 62-venuepage-konsolidaatio
    provides: consolidated PaikkaSheet venue-detail surface (unrelated but sequenced before Phase 63)
provides:
  - "app/api/business/update-paikka/route.ts auto-resubmits a rejected venue's claim_status back to pending on any successful section save (D-07)"
  - "Extended Vitest coverage proving the flip, the approved/pending no-op, and the client-input-ignored security case"
affects: [63-05 (dashboard wiring — removes the explicit reapply UI now made redundant by this auto-resubmit)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-derived status transition: claim_status flip decision is read from the already-authenticated ownership row (linkRow.claim_status), never from request body"
    - "Concurrency-guarded UPDATE ... WHERE claim_status = 'rejected' (copied from reapply/route.ts) so only the first of two racing saves performs the transition"
    - "Non-critical secondary write pattern: flip UPDATE failure is logged, not thrown — never masks the already-persisted 200 for the primary section save"

key-files:
  created: []
  modified:
    - app/api/business/update-paikka/route.ts
    - tests/api/update-paikka.test.ts

key-decisions:
  - "D-07 implemented exactly as specified: rejected -> pending flip is a side effect of update-paikka, not a separate endpoint"
  - "D-15 honored: the 24h COOLDOWN_MS check from reapply/route.ts was deliberately not ported"
  - "reapply/route.ts left in place (untouched) — Plan 05 deletes it once its UI callers are removed"

patterns-established:
  - "Auto-resubmit-on-save: any successful section save on a rejected venue silently restores pending status server-side, with no explicit user-facing resubmit action"

requirements-completed: [PREV-05]

coverage:
  - id: D1
    description: "update-paikka flips business_paikka_links.claim_status from rejected to pending (and clears rejection_reason) when a rejected venue's section is saved"
    requirement: "PREV-05"
    verification:
      - kind: unit
        ref: "tests/api/update-paikka.test.ts#flips claim_status from rejected to pending on a successful save (D-07)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Saving a section of an approved (or pending) venue does NOT touch claim_status"
    requirement: "PREV-05"
    verification:
      - kind: unit
        ref: "tests/api/update-paikka.test.ts#does NOT flip claim_status when the venue is approved (D-07 no-op)"
        status: pass
    human_judgment: false
  - id: D3
    description: "A client-supplied body claim_status field is ignored — the flip decision is always derived server-side from the ownership row"
    requirement: "PREV-05"
    verification:
      - kind: unit
        ref: "tests/api/update-paikka.test.ts#ignores a client-supplied body claim_status field (D-07 security)"
        status: pass
    human_judgment: false

duration: 12min
completed: 2026-07-01
status: complete
---

# Phase 63 Plan 03: Auto-Resubmit-on-Save (D-07) Summary

**update-paikka now auto-flips a rejected venue's claim_status back to pending on any successful section save, concurrency-guarded and never trusting client input, with 17 Vitest cases (14 existing + 3 new) all green.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-07-01T14:41:00Z
- **Completed:** 2026-07-01T14:53:40Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Extended the `business_paikka_links` ownership `.select()` in `update-paikka/route.ts` to include `claim_status`, giving the handler the server-side status needed for the D-07 decision.
- Added a new branch after the existing `liikuntapaikat` section-save: when `linkRow.claim_status === 'rejected'`, an UPDATE sets `claim_status: 'pending'`, `rejection_reason: null`, and `submitted_at: <now>`, scoped to `business_account_id` + `paikka_id` + guarded by `.eq('claim_status', 'rejected')` (same concurrency pattern as `reapply/route.ts`) so only the first of two racing saves transitions the row.
- The flip is never triggered by request-body content — `claim_status` is not read from `data`/`body` anywhere in the branch; a failed flip is logged but does not affect the already-persisted 200 response for the section save.
- Extended the chainable `business_paikka_links` Supabase mock in `tests/api/update-paikka.test.ts` to support both the existing ownership-read chain and the new flip-update chain (via a `then()`-based thenable so `await ... .eq().eq().eq()` resolves correctly), added a `mockLinkUpdate`/`mockLinkUpdateEq` spy pair, and added 3 new test cases covering the flip, the approved no-op, and the client-input-ignored security case.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add auto-resubmit-on-save branch to update-paikka route (D-07)** - `ebe2fe0` (feat)
2. **Task 2: Extend update-paikka tests with D-07 cases (rejected flip, approved no-op, client-input ignored)** - `24071e1` (test)

**Plan metadata:** committed separately per worktree protocol (SUMMARY.md only — STATE.md/ROADMAP.md owned by orchestrator)

## Files Created/Modified
- `app/api/business/update-paikka/route.ts` - Extended ownership select to `paikka_id, claim_status`; added the D-07 auto-resubmit branch after the successful `liikuntapaikat` update
- `tests/api/update-paikka.test.ts` - Extended the chainable `business_paikka_links` mock (ownership read + flip update chains); added `mockOwnership()`/`setLinkFlipSuccess()` helpers and 3 new D-07 test cases

## Decisions Made
- Followed the plan exactly: D-07 flip lives inline in `update-paikka/route.ts` as a post-save side effect, not a new endpoint.
- D-15 honored — the 24h `COOLDOWN_MS` reapply-flood guard from `reapply/route.ts` was deliberately NOT ported; verified via `grep -c "COOLDOWN"` returning 0.
- `reapply/route.ts` left untouched (its deletion is scoped to Plan 05, after UI callers are removed).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Initial implementation included the substring "COOLDOWN_MS" inside an explanatory code comment, which caused the `grep -c "COOLDOWN" app/api/business/update-paikka/route.ts` acceptance check to return 1 instead of the required 0. Reworded the comment to avoid the substring entirely (no functional change) and re-verified all acceptance-criteria greps before committing.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 05 (dashboard wiring) can now safely remove the explicit `/api/business/reapply` UI trigger from `app/business/page.tsx` (`handleReapply`/`StatusCard` reapply CTA) — the auto-resubmit-on-save behavior implemented here fully replaces it.
- `reapply/route.ts` itself remains on disk; Plan 05 is responsible for confirming zero remaining callers and deleting the file/folder.
- `npm test` (full suite, 227 tests across 21 files) passes with no regressions introduced by this plan.

---
*Phase: 63-business-dashboardin-preview-n-kymien-uudistus*
*Completed: 2026-07-01*
