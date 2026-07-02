---
phase: 64-hallintaoikeuspyynn-t-dashboard-ui
plan: 05
subsystem: ui
tags: [react, typescript, vitest, tdd, team-management]

requires:
  - phase: 64-hallintaoikeuspyynn-t-dashboard-ui
    provides: TeamManagementPopup.tsx (approve/reject/remove flow, Plans 64-01/64-02/64-03)
provides:
  - Pure pendingRowToTeamMember mapper (lib/teamManagement.ts) with unit test coverage
  - Shared PendingRequestRow/TeamMemberRow types as single source of truth
  - handleApprove optimistic update that moves the approved row from "Pending requests" to "Current team" in the same render pass
affects: [team-management, business-dashboard]

tech-stack:
  added: []
  patterns:
    - "Pure mapper functions extracted to lib/ with a co-located vitest test (mirrors lib/onboardingUtils.ts convention)"
    - "Client-side optimistic list-move on mutation success, guarded by a prev.some(...) dedupe check"

key-files:
  created:
    - lib/teamManagement.ts
    - lib/teamManagement.test.ts
  modified:
    - app/components/TeamManagementPopup.tsx

key-decisions:
  - "Constructed the new TeamMemberRow client-side from the already-in-state pendingRequests row (option (a) from the debug doc) rather than changing the approve Route Handler's response shape or refetching the list endpoint — no backend changes needed."

patterns-established:
  - "pendingRowToTeamMember: requesterId maps to userId, role is hardcoded to the literal 'member' (approve only ever grants member-level access), isSelf is always false (a pending requester is never the approving owner)"

requirements-completed: [ACCESS-04]

coverage:
  - id: D1
    description: "pendingRowToTeamMember pure mapper correctly converts an approved pending row into a team-member row (requesterId->userId, role='member', isSelf=false, email null-passthrough)"
    requirement: "ACCESS-04"
    verification:
      - kind: unit
        ref: "lib/teamManagement.test.ts#pendingRowToTeamMember"
        status: pass
    human_judgment: false
  - id: D2
    description: "After clicking Approve on a pending request, the approved member appears in the 'Current team' section in the same render pass, without closing and reopening the popup; pending row still removed; no duplicate row"
    requirement: "ACCESS-04"
    verification:
      - kind: manual_procedural
        ref: "Task 2 checkpoint:human-verify — operator re-ran UAT Test 3's approve step"
        status: pass
    human_judgment: true
    rationale: "Requires a live päähallitsija session against a real pending business_access_requests row and visual confirmation of render-pass timing/no-duplicate — not automatable as a unit test."

duration: 9min
completed: 2026-07-02
status: complete
---

# Phase 64 Plan 05: Approve-flow Current-team refresh gap closure Summary

**Pure `pendingRowToTeamMember` mapper wired into `handleApprove` so the approved member moves from "Pending requests" to "Current team" in the same render pass, closing UAT Test 3's stale-list gap.**

## Performance

- **Duration:** 9 min (test-to-implementation); checkpoint wait time excluded
- **Started:** 2026-07-02T14:14:55Z
- **Completed:** 2026-07-02T14:47:04Z
- **Tasks:** 2 (1 code task + 1 human-verify checkpoint)
- **Files modified:** 3

## Accomplishments
- Extracted the two previously-inline row types (`PendingRequestRow`, `TeamMemberRow`) out of `TeamManagementPopup.tsx` into a new `lib/teamManagement.ts` single source of truth, alongside a pure `pendingRowToTeamMember` mapper
- Wired the mapper into `handleApprove`'s `res.ok` branch: looks up the approved row from `pendingRequests` by `requestId`, then appends the mapped row to `teamMembers` with a `prev.some(...)` dedupe guard — mirroring the existing optimistic-update pattern already used in `handleConfirmRemove`
- Unit-tested the mapper (2 tests: requesterId→userId/role/isSelf mapping, and `email: null` passthrough)
- Operator re-ran UAT Test 3's approve step against the fix and confirmed: pending row disappears AND the same person appears immediately in "Current team" with no popup reopen and no duplicate row

## Task Commits

Each task was committed atomically (TDD RED → GREEN):

1. **Task 1: Extract pendingRowToTeamMember mapper and wire it into handleApprove**
   - `0fe486d` (test) — failing test for the mapper, added before the mapper existed
   - `e71a276` (feat) — `lib/teamManagement.ts` + `handleApprove` wiring; test passes

**Plan metadata:** committed alongside this SUMMARY.md

_TDD gate sequence verified in git log: `test(64-05)` commit precedes `feat(64-05)` commit — RED then GREEN, both present._

## Files Created/Modified
- `lib/teamManagement.ts` - `PendingRequestRow`/`TeamMemberRow` shared types + pure `pendingRowToTeamMember(row)` mapper
- `lib/teamManagement.test.ts` - vitest coverage for the mapper (2 tests, mirrors `lib/onboardingUtils.test.ts` structure)
- `app/components/TeamManagementPopup.tsx` - removed inline type declarations (now imported from `lib/teamManagement`), `handleApprove` appends the approved member to `teamMembers` on success with a dedupe guard

## Decisions Made
- Chose client-side construction of the new `TeamMemberRow` from the already-fetched `pendingRequests` row over the two other viable options identified in the debug doc (changing the approve Route Handler's response shape, or refetching the list endpoint after approve) — no backend/API changes needed, smallest possible diff, and consistent with the existing `handleConfirmRemove` optimistic-update pattern already in the file.

## Deviations from Plan

None — plan executed exactly as written. TDD RED/GREEN sequence followed per the task's `tdd="true"` attribute (test file written and run to confirm failure before the mapper/wiring existed).

## Issues Encountered

None specific to this plan's scope. During the operator's manual verification of Task 2, a separate pre-existing bug was found (missing venue-exclusivity guard in the admin claim-approval endpoint) — that is unrelated to the approve-flow list-refresh fix delivered here and has been tracked separately as backlog Phase 999.1; it is explicitly out of scope for this plan and is not part of its deliverable.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- ACCESS-04's remaining UAT gap (Phase 64 Test 3) is closed. Phase 64's team-management dashboard UI (approve/reject/remove) is now fully verified end-to-end.
- No blockers for closing out Phase 64.

---
*Phase: 64-hallintaoikeuspyynn-t-dashboard-ui*
*Completed: 2026-07-02*
