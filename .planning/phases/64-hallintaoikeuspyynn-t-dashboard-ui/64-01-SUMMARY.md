---
phase: 64-hallintaoikeuspyynn-t-dashboard-ui
plan: 01
subsystem: api
tags: [nextjs, supabase, route-handler, rls, vitest, tdd]

requires:
  - phase: 60-hallintaoikeuspyynn-t-backend-s-hk-posti
    provides: business_access_requests table, approve/reject Route Handlers, venue-scoped owner authorization pattern
  - phase: 59-multi-company-skeemamigraatio
    provides: companies table, business_accounts.role, business_paikka_links composite UNIQUE + RLS
provides:
  - "GET /api/business/access-request/list Route Handler — venue-scoped owner read of pending requests + current team with resolved identity"
  - "Vitest unit coverage for the list endpoint (5 cases: happy path, 2 forbidden variants, unauthorized, identity-resolution fallback)"
affects: [64-04-team-management-popup, business-dashboard-ui]

tech-stack:
  added: []
  patterns:
    - "Route Handler self-fetch mock pattern: chainable supabaseAdmin table-mock keyed by table name, call-count-routed when the same table is queried twice with different chain shapes in one handler"

key-files:
  created:
    - app/api/business/access-request/list/route.ts
    - tests/api/access-request-list.test.ts
  modified: []

key-decisions:
  - "Identity resolution for pending requesters uses the getUserById email/full_name fallback chain only (no business_accounts.display_name join exists for business_access_requests rows) — display_name only applies to the teamMembers path via the business_paikka_links→business_accounts join"
  - "getUserById calls are de-duplicated across the union of requester_ids and team member business_account_ids before resolving, avoiding redundant admin API calls when the same person appears in both lists"

patterns-established:
  - "When a single Supabase table is queried twice in one Route Handler with different chain shapes (maybeSingle probe vs. array fetch), route the mock via a vi.fn() call-count (not a plain closure variable) so vi.clearAllMocks() resets it between test cases"

requirements-completed: [ACCESS-04]

coverage:
  - id: D1
    description: "Approved owner can read a venue's pending access requests with resolved requester name/email, and the full current-team list with role + isSelf flag"
    requirement: "ACCESS-04"
    verification:
      - kind: unit
        ref: "tests/api/access-request-list.test.ts#returns pending requests"
        status: pass
      - kind: unit
        ref: "tests/api/access-request-list.test.ts#identity resolution fallback"
        status: pass
    human_judgment: false
  - id: D2
    description: "Non-owner callers (no approved link, or approved link but role!=='owner') are refused with 403 and no data"
    requirement: "ACCESS-04"
    verification:
      - kind: unit
        ref: "tests/api/access-request-list.test.ts#forbidden"
        status: pass
      - kind: unit
        ref: "tests/api/access-request-list.test.ts#forbidden non-owner role"
        status: pass
    human_judgment: false
  - id: D3
    description: "Unauthenticated/invalid bearer token is rejected with 401"
    verification:
      - kind: unit
        ref: "tests/api/access-request-list.test.ts#unauthorized"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-07-02
status: complete
---

# Phase 64 Plan 01: Access-request list Route Handler Summary

**New service-role `GET /api/business/access-request/list` Route Handler returning a venue's pending access requests and current approved team with resolved identity, gated by venue-scoped owner authorization — the read side of ACCESS-04.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-07-02T12:38:41Z
- **Completed:** 2026-07-02T12:42:43Z
- **Tasks:** 2 completed
- **Files modified:** 2 (1 created route, 1 created test)

## Accomplishments
- Implemented `app/api/business/access-request/list/route.ts`, mirroring `approve/route.ts`'s JWT-verify + venue-scoped owner authorization shape (approved `business_paikka_links` row for the specific `paikka_id` AND `business_accounts.role === 'owner'`)
- Cross-account identity resolution (pending requesters + current team members) resolved exclusively via `supabaseAdmin.auth.admin.getUserById` — never the anon browser client — with de-duplication across the union of ids from both lists
- `teamMembers` rows carry `isSelf` so the caller's own approved row is visible (not omitted) for Plan 64-04's disabled-row rendering (D-14)
- Full TDD RED→GREEN cycle: 5-case Vitest suite written first (confirmed failing on missing module import), then the route implemented to pass all 5

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave 0 — failing unit test for the list endpoint** - `d6107cf` (test)
2. **Task 2: Implement the list Route Handler** - `ba1d2a7` (feat)

**Plan metadata:** commit pending (this SUMMARY + worktree metadata commit)

_TDD plan: test → feat cycle, no refactor step needed._

## Files Created/Modified
- `app/api/business/access-request/list/route.ts` - New GET Route Handler: JWT verify → venue-scoped owner auth → pending requests + team member fetch → identity resolution → flat JSON response
- `tests/api/access-request-list.test.ts` - Vitest unit suite: owner read (happy path), forbidden (no approved link), forbidden (non-owner role), unauthorized (401), identity resolution fallback (display_name null → email fallback)

## Decisions Made
- Pending requesters resolve name via the `getUserById` fallback chain only (`user_metadata.full_name ?? email ?? id`) since `business_access_requests` carries no `business_accounts` join in this plan's scope — `display_name` only applies to the `teamMembers` path. This matches Task 2's action steps exactly (step 4 fetches only `id, requester_id, created_at`; no display_name join for pending rows).
- `getUserById` calls are de-duplicated across the union of `requester_id`s and team member `business_account_id`s before resolving, to avoid redundant admin-API calls when the same person appears in both the pending and team lists.

## Deviations from Plan

None — plan executed exactly as written. One test-authoring bug was found and fixed during the RED→GREEN cycle itself (not a deviation from the plan's functional scope): the `business_paikka_links` select-call-order mock initially used a plain closure variable to distinguish the owner-auth probe (1st select) from the team-member list fetch (2nd select); this variable was not reset by `vi.clearAllMocks()` between test cases, so the 2nd, 3rd, and 5th tests (each only exercising the 1st `business_paikka_links` select) accumulated leftover call counts from prior tests and were routed to the wrong mock chain shape. Fixed by tracking the call count via a `vi.fn()` (whose `.mock.calls.length` IS reset by `vi.clearAllMocks()`) instead of a plain variable. Verified: all 5 tests pass independently and as a suite; full suite (238 tests) green.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `GET /api/business/access-request/list` is ready for Plan 64-04's `TeamManagementPopup.tsx` to fetch on open (per 64-PATTERNS.md's documented fetch-on-open pattern, mirroring `liity/page.tsx`'s bearer-token fetch shape).
- Response shape `{ pendingRequests: [{ id, requesterId, name, email }], teamMembers: [{ userId, name, email, role, isSelf }] }` is fixed and matches what 64-04's plan/pattern map expects.
- No blockers. `display_name` column referenced by this endpoint (`business_accounts.display_name`) is created in Plan 64-03 — this plan's code reads it defensively via optional chaining (`m.business_accounts?.display_name`), so it degrades gracefully (falls through to email fallback) if run before 64-03's migration lands, though in practice Plan 64-03 will land before this endpoint sees real traffic.

---
*Phase: 64-hallintaoikeuspyynn-t-dashboard-ui*
*Completed: 2026-07-02*
