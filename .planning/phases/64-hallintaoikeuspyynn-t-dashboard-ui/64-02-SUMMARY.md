---
phase: 64-hallintaoikeuspyynn-t-dashboard-ui
plan: 02
subsystem: api
tags: [supabase, route-handler, rbac, vitest, tdd]

# Dependency graph
requires:
  - phase: 60-hallintaoikeuspyynn-t-backend-s-hk-posti
    provides: business_paikka_links / business_accounts schema, approve/route.ts JWT-verify + venue-scoped owner authorization + count-guard pattern
provides:
  - "app/api/business/access-request/remove/route.ts — service-role POST Route Handler for owner-initiated sub-manager removal (ACCESS-07)"
  - "tests/api/access-request-remove.test.ts — Vitest unit coverage for the removal contract"
affects: [64-04 (team-management popup calls this endpoint)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Removal endpoints use a literal DELETE with {count:'exact'} for concurrency-safe destructive operations, never a status UPDATE when the CHECK constraint has no terminal 'removed' value"
    - "Self-action hard-blocks (e.g. cannot remove yourself) are checked server-side BEFORE any DB access, independent of client/UI state"

key-files:
  created:
    - app/api/business/access-request/remove/route.ts
    - tests/api/access-request-remove.test.ts
  modified: []

key-decisions:
  - "Removal implemented as literal DELETE (not UPDATE claim_status='removed') — the CHECK constraint only allows pending|approved|rejected"
  - "No email notification on removal (D-11) — lib/email is not imported by the route"

patterns-established:
  - "Pattern: venue-scoped owner authorization (approved link for the specific paikka_id AND role==='owner') replicated identically from approve/route.ts for any future owner-gated mutation on business_paikka_links"

requirements-completed: [ACCESS-07]

coverage:
  - id: D1
    description: "Approved owner can DELETE a sub-manager's business_paikka_links row for a specific paikka_id"
    requirement: "ACCESS-07"
    verification:
      - kind: unit
        ref: "tests/api/access-request-remove.test.ts#removes member"
        status: pass
    human_judgment: false
  - id: D2
    description: "Non-owner / caller without an approved link for the venue is rejected with 403 and no DELETE occurs"
    requirement: "ACCESS-07"
    verification:
      - kind: unit
        ref: "tests/api/access-request-remove.test.ts#forbidden non-owner"
        status: pass
    human_judgment: false
  - id: D3
    description: "Server hard-blocks self-removal (target_user_id === caller.id) with 400, checked before any DB access, regardless of UI state"
    requirement: "ACCESS-07"
    verification:
      - kind: unit
        ref: "tests/api/access-request-remove.test.ts#self-removal blocked"
        status: pass
    human_judgment: false
  - id: D4
    description: "Removal authorization is venue-scoped — an owner of Venue A cannot remove a member from Venue B"
    requirement: "ACCESS-07"
    verification:
      - kind: unit
        ref: "tests/api/access-request-remove.test.ts#venue-scoped"
        status: pass
    human_judgment: false
  - id: D5
    description: "Concurrent double-removal only deletes once — second call sees count 0 and returns 404"
    requirement: "ACCESS-07"
    verification:
      - kind: unit
        ref: "tests/api/access-request-remove.test.ts#concurrency"
        status: pass
    human_judgment: false
  - id: D6
    description: "Unauthenticated / invalid bearer token requests are rejected with 401"
    verification:
      - kind: unit
        ref: "tests/api/access-request-remove.test.ts#unauthorized"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-07-02
status: complete
---

# Phase 64 Plan 02: Access-Request Removal Route Handler Summary

**New service-role `POST /api/business/access-request/remove` endpoint lets an approved venue owner DELETE a sub-manager's `business_paikka_links` row, with a server-side self-removal hard-block and venue-scoped authorization — TDD RED/GREEN, six Vitest cases, no email notification (D-11).**

## Performance

- **Duration:** 10 min
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- New `app/api/business/access-request/remove/route.ts` implementing ACCESS-07: JWT verify → parse `{ paikka_id, target_user_id }` → self-removal hard-block (400, checked before DB access) → venue-scoped owner authorization (approved link for the specific `paikka_id` + `role==='owner'`, mirrors `approve/route.ts` exactly) → concurrency-safe literal `DELETE` with `{ count: 'exact' }` → 404 on already-removed member.
- New `tests/api/access-request-remove.test.ts` with six named cases covering the full behavior contract (happy path, forbidden non-owner, self-removal block, venue-scoped IDOR prevention, concurrency, unauthorized).
- Confirmed via TDD: RED commit (route module absent, import error) followed by GREEN commit (all 6 tests pass, full suite 239/239 green, typecheck clean).

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 — failing unit test for the removal endpoint** - `ad32f98` (test)
2. **Task 2: Implement the removal Route Handler** - `a823178` (feat)

_TDD: RED (`ad32f98`) → GREEN (`a823178`). No refactor commit needed — implementation matched the RESEARCH.md skeleton cleanly on first pass._

## TDD Gate Compliance

Gate sequence verified in git log:
1. RED gate: `ad32f98 test(64-02): add failing test for access-request removal endpoint (ACCESS-07)` — confirmed failing (unresolved import) before implementation existed.
2. GREEN gate: `a823178 feat(64-02): implement access-request removal Route Handler (ACCESS-07)` — all 6 tests pass after implementation.
3. REFACTOR gate: not applicable — no refactor commit was needed.

Compliant, no warnings.

## Files Created/Modified
- `app/api/business/access-request/remove/route.ts` - New Route Handler: owner-only, venue-scoped, concurrency-safe DELETE of a sub-manager's access, with a server-enforced self-removal hard-block and no email side effect
- `tests/api/access-request-remove.test.ts` - Vitest unit suite (6 cases) covering the full ACCESS-07 authorization/behavior contract

## Decisions Made
- Removal implemented as a literal `DELETE`, not an `UPDATE ... SET claim_status='removed'` — the `claim_status` CHECK constraint only allows `pending|approved|rejected`; a status write would 500 at runtime (RESEARCH.md Pitfall 4).
- No email import in the route file (D-11) — removal is silent by design; the test mocks `sendAccessRequestDecisionEmail`/`sendAccessRequestNotificationEmail` specifically to assert neither is ever called.
- Self-removal hard-block placed as the very first check after JSON parsing, before any Supabase query, per D-12/D-14 — verified by a dedicated test that no owner-auth probe or DELETE mock is invoked when the target is the caller.

## Deviations from Plan

None — plan executed exactly as written. The Task 2 implementation matches the RESEARCH.md "Removal Route Handler skeleton" essentially verbatim, with the added one-line comment on the approval-publish trigger's DELETE-non-firing behavior (Pitfall 5) as specified in the plan's action block.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- ACCESS-07 backend is complete and unit-tested; Plan 64-04 (team-management popup) can call `POST /api/business/access-request/remove` with `{ paikka_id, target_user_id }` and expect 200/400/403/404/401 per this contract.
- No blockers for downstream plans in this phase.

---
*Phase: 64-hallintaoikeuspyynn-t-dashboard-ui*
*Completed: 2026-07-02*
