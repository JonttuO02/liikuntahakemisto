---
phase: 32-yritysrekisterointi-auth
plan: 02
subsystem: api
tags: [jwt, supabase, route-handler, business-accounts, atomicity, elevation-of-privilege]

# Dependency graph
requires:
  - phase: 31-db-skeema-storage-perusta
    provides: business_accounts table with user_id PK, company_name, approval_status columns
  - phase: 32-yritysrekisterointi-auth (plan 01)
    provides: i18n Business namespace and /business stub page context
provides:
  - POST /api/business/register Route Handler with JWT verification + business_accounts INSERT + deleteUser rollback
affects:
  - 32-03 (rekisteröintisivu calls this endpoint)
  - 33-claim (future claim flow may reuse same pattern)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JWT verification via supabaseAdmin.auth.getUser(token) in Route Handler — prevents elevation-of-privilege when service role bypasses RLS"
    - "Atomicity rollback pattern: supabaseAdmin.auth.admin.deleteUser on INSERT failure prevents orphan auth users"

key-files:
  created:
    - app/api/business/register/route.ts
  modified: []

key-decisions:
  - "Verified user.id from JWT used for INSERT — body.user_id ignored to prevent elevation-of-privilege (T-32-02-01)"
  - "supabaseAdmin.auth.admin.deleteUser called immediately on INSERT failure — auth user never left as orphan (D-10 atomicity)"
  - "company_name trimmed and sliced to 200 chars server-side regardless of client input (T-32-02-03)"

patterns-established:
  - "JWT-verified Route Handler pattern: extract Authorization header, call supabaseAdmin.auth.getUser, use verified user.id"

requirements-completed:
  - BIZ-01

# Metrics
duration: 8min
completed: 2026-06-05
---

# Phase 32 Plan 02: /api/business/register Route Handler Summary

**POST Route Handler with JWT verification that inserts a business_accounts row using the verified user.id and rolls back by deleting the auth user if INSERT fails**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-05T12:05:00Z
- **Completed:** 2026-06-05T12:13:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `app/api/business/register/route.ts` — POST Route Handler exporting `POST`
- JWT verification via `supabaseAdmin.auth.getUser(token)` before any DB operation — unauthenticated requests return 401
- INSERT uses verified `user.id` from JWT, never the client-supplied body.user_id — prevents elevation-of-privilege (T-32-02-01)
- Atomicity rollback: `supabaseAdmin.auth.admin.deleteUser(user.id)` called on INSERT failure, then 500 returned — no orphan auth users (D-10)
- `company_name` sanitized server-side: `trim().slice(0, 200)` (T-32-02-03)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create /api/business/register POST Route Handler** - `3ffc88b` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `app/api/business/register/route.ts` - POST Route Handler: JWT verification, business_accounts INSERT, atomicity rollback via deleteUser

## Decisions Made

- Followed the security gap mitigation identified in RESEARCH.md: JWT verification gates the endpoint so unauthenticated callers cannot exploit the service role key's RLS bypass
- Used `supabaseAdmin.auth.getUser(token ?? '')` with empty-string fallback so missing Authorization header returns a clean auth error rather than a token parsing exception
- No `createServerSupabase` / `cookies()` used — the pattern uses the Bearer token directly as recommended in RESEARCH.md

## Deviations from Plan

None - plan executed exactly as written. The JWT verification and atomicity rollback were specified in the plan's action steps; no unplanned work was required.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. Supabase environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are already configured from Phase 31.

## Known Stubs

None. This file contains no stub patterns — it is a complete server-side route handler with real logic.

## Threat Flags

No new threat surface introduced beyond what was planned. The threat model in the plan covers all security-relevant surfaces of this file.

## Next Phase Readiness

- `POST /api/business/register` is ready for consumption by `/business/rekisteroidy` page (Plan 03)
- Caller must send `Authorization: Bearer <session.access_token>` header and `{ company_name }` JSON body
- On success: `{ ok: true }` with 200; on failure: `{ error: '...' }` with 500 and auth user deleted

## Self-Check

- [x] `app/api/business/register/route.ts` exists in worktree
- [x] Commit `3ffc88b` exists in git log

---
*Phase: 32-yritysrekisterointi-auth*
*Completed: 2026-06-05*
