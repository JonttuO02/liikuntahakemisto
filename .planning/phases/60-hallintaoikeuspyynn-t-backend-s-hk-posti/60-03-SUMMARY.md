---
phase: 60-hallintaoikeuspyynn-t-backend-s-hk-posti
plan: "03"
subsystem: backend/access-request
tags: [route-handler, access-request, idempotency, email-notification, invite-link]
status: complete

dependency_graph:
  requires:
    - "60-01 (business_access_requests table + nullable company_id migration)"
    - "60-02 (sendAccessRequestNotificationEmail in lib/email.ts)"
  provides:
    - "POST /api/business/access-request/submit — D-08/D-09/D-10 guards + owner notification"
    - "invite: true path in POST /api/business/register — company_id NULL signup for D-09a"
  affects:
    - "app/api/business/register/route.ts"
    - "app/api/business/access-request/submit/route.ts"

tech_stack:
  added: []
  patterns:
    - "D-08 idempotent insert: 23505 unique-violation catch -> re-fetch existing pending row -> return ok:true"
    - "D-09 guard: maybeSingle on business_accounts.company_id IS NOT NULL -> 400"
    - "D-10 guard: maybeSingle on business_paikka_links WHERE paikka_id + claim_status='approved' -> 400 if missing"
    - "Venue-scoped owner lookup (Pitfall 5): business_paikka_links joined to business_accounts by paikka_id, not company-wide"
    - "Non-critical email in try/catch with [access-request/submit] log prefix"
    - "invite: boolean flag in register body -- skips companies INSERT, inserts business_accounts with company_id=null and role='member'"

key_files:
  created:
    - path: app/api/business/access-request/submit/route.ts
      description: "Access-request submission endpoint -- JWT verify, D-09/D-10 guards, D-08 idempotent insert, owner email"
  modified:
    - path: app/api/business/register/route.ts
      description: "Extended with invite: boolean flag -- invite path inserts business_accounts with company_id=null and role='member', skips companies INSERT"

decisions:
  - "D-09a invite path added as conditional branch in existing register endpoint (not a new sibling file) -- minimizes surface area"
  - "D-09 error returned in Finnish per UI-SPEC copywriting contract"
  - "D-10 error returned in Finnish per UI-SPEC copywriting contract"
  - "Owner lookup is venue-scoped via business_paikka_links.paikka_id (Pitfall 5 from PATTERNS.md) -- never company-wide"
  - "Idempotent duplicate path (23505) does NOT re-send the notification email -- avoids duplicate notifications"
  - "requester_id always taken from JWT-verified user.id (T-60-07 threat mitigation)"

metrics:
  duration: "~8 minutes"
  completed: "2026-06-25T19:09:10Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 60 Plan 03: Submit Endpoint & Invite-Link Signup Summary

**One-liner:** D-08/D-09/D-10 access-request submit endpoint with idempotent insert and venue-scoped owner notification email; register endpoint extended with invite-link path (company_id=NULL, role='member') per D-09a.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend register endpoint with invite-link no-auto-company path (D-09a) | fbdb855 | app/api/business/register/route.ts |
| 2 | Create access-request submit Route Handler with D-08/D-09/D-10 guards | de7529a | app/api/business/access-request/submit/route.ts |

## What Was Built

### Task 1 -- Register endpoint invite path (D-09a)

`app/api/business/register/route.ts` now accepts an optional `invite: boolean` flag in the request body.

- **When `invite === true`** (invite-link signup): skips the `companies` INSERT entirely; inserts `business_accounts` with `company_id: null` and `role: 'member'`. The `company_name` validation is bypassed in this path (invite-link employees join an existing company, not name a new one). `company_id` remains NULL until Plan 04's approval writes set it.
- **When `invite` is falsy** (default): existing behavior unchanged -- companies INSERT + rollback-on-failure + role:'owner'.
- Both branches use the JWT-verified `user.id`, never `body.user_id` (T-60-07).

### Task 2 -- Submit endpoint (D-08/D-09/D-10)

New `app/api/business/access-request/submit/route.ts` exports `POST(request: Request)`. Validation order matches PLAN.md spec:

1. **JWT verify** -- `supabaseAdmin.auth.getUser(token)`, 401 on failure
2. **paikka_id parse** -- `parseInt(body.paikka_id, 10)` + `isNaN` guard, 400 on invalid (T-60-08)
3. **D-09 guard** -- `maybeSingle` on `business_accounts WHERE user_id = user.id`; 400 if no row (must register first); 400 with Finnish error if `company_id IS NOT NULL` (already belongs to a company)
4. **D-10 guard** -- `maybeSingle` on `business_paikka_links WHERE paikka_id = X AND claim_status = 'approved'`; 400 with Finnish error if no row (no approved owner -- invite link invalid); no orphan request row created
5. **D-08 idempotent insert** -- `supabaseAdmin.from('business_access_requests').insert(...).select().single()`; on `insertError?.code === '23505'` re-fetches existing pending row and returns `{ ok: true, request: existing }` without re-sending the email
6. **Owner notification email** (non-critical try/catch) -- resolves venue name from `liikuntapaikat`, owner `business_account_id` from `business_paikka_links` (venue-scoped, Pitfall 5), owner email via `supabaseAdmin.auth.admin.getUserById`; calls `sendAccessRequestNotificationEmail`; logs `[access-request/submit]` prefix on failure, never blocks 200

## Deviations from Plan

None -- plan executed exactly as written. Finnish error copy sourced from UI-SPEC copywriting contract as specified.

## Threat Mitigations Applied

| Threat ID | Mitigation | Applied In |
|-----------|-----------|-----------|
| T-60-07 | requester_id from JWT-verified user.id, never body.requester_id | Both files |
| T-60-08 | parseInt + isNaN guard on paikka_id | submit/route.ts |
| T-60-09 | D-10 guard requires approved owner before insert | submit/route.ts |
| T-60-10 | D-08 partial UNIQUE + idempotent 23505 catch | submit/route.ts |
| T-60-05 | sendAccessRequestNotificationEmail uses sub()/esc() from Plan 02 | lib/email.ts (Plan 02) |
| T-60-SC | Zero new packages -- no supply chain risk | both files |

## Known Stubs

None -- both files are fully wired to Supabase and Resend. No placeholder data or hardcoded mock values.

## Threat Flags

None -- no new network endpoints, auth paths, file access patterns, or schema changes beyond what the plan's threat model covers.

## Self-Check: PASSED

- [x] `app/api/business/access-request/submit/route.ts` -- exists (created, committed de7529a)
- [x] `app/api/business/register/route.ts` -- invite flag present, company_id: null present (committed fbdb855)
- [x] `npx tsc --noEmit` -- passed (no output = clean)
- [x] grep checks: `export async function POST`, `23505`, `sendAccessRequestNotificationEmail` -- all present
- [x] Both commits in `worktree-agent-a215264fb29e6cbaa` branch
