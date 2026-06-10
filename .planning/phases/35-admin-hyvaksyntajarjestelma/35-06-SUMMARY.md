---
phase: 35-admin-hyvaksyntajarjestelma
plan: "06"
subsystem: admin-api
tags: [admin, approve, reject, jwt, is_admin, email]
dependency_graph:
  requires:
    - 35-03  # lib/email.ts (sendApprovalEmail, sendRejectionEmail)
    - 35-04  # DB schema — business_paikka_links.claim_status, rejection_reason
  provides:
    - POST /api/admin/approve — JWT+is_admin guard, sets claim_status=approved, publishes created venues
    - POST /api/admin/reject  — JWT+is_admin guard, sets claim_status=rejected, saves rejection_reason
  affects:
    - 35-07  # Admin UI page will call these endpoints
tech_stack:
  added: []
  patterns:
    - Double-guard pattern (JWT via supabaseAdmin.auth.getUser + is_admin profile check)
    - Non-critical email sends wrapped in try/catch
    - supabaseAdmin service role for all DB reads (anon blocked by RLS)
key_files:
  created:
    - app/api/admin/approve/route.ts
    - app/api/admin/reject/route.ts
    - lib/email.ts  # checked out from master — required dependency
  modified: []
decisions:
  - "lib/email.ts checked out from master into worktree (Rule 3 auto-fix — file missing from worktree but committed on master at 57c97ab)"
  - "resend module not installed in node_modules — pre-existing env issue; tsc error is in lib/email.ts only, not in the two new routes"
metrics:
  duration: "~10 minutes"
  completed: "2026-06-10"
  tasks_completed: 2
  files_created: 3
---

# Phase 35 Plan 06: Admin Approve and Reject API Routes Summary

JWT-guarded approve/reject Route Handlers with double-guard (JWT + is_admin) that mutate claim_status and send non-critical confirmation emails via lib/email.ts.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create app/api/admin/approve/route.ts | 2f4e7e9 | app/api/admin/approve/route.ts |
| 2 | Create app/api/admin/reject/route.ts | 2f4e7e9 | app/api/admin/reject/route.ts |

## What Was Built

### app/api/admin/approve/route.ts

POST endpoint with:
1. JWT verification via `supabaseAdmin.auth.getUser(token)` — returns 401 if invalid
2. `is_admin` check in `profiles` table — returns 403 if not admin
3. Parses `link_id` from request body — returns 400 if missing/invalid
4. Fetches `business_paikka_links` row (`paikka_id`, `business_account_id`, `link_type`)
5. Sets `claim_status = 'approved'` on the link
6. For `link_type = 'created'`: sets `published = true` on `liikuntapaikat` (non-critical)
7. Sends approval email to business user (non-critical, try/catch)

### app/api/admin/reject/route.ts

POST endpoint with:
1. JWT verification — returns 401 if invalid
2. `is_admin` check — returns 403 if not admin
3. Parses `link_id` + `reason` from body — returns 400 if either missing
4. Fetches `business_paikka_links` row
5. Sets `claim_status = 'rejected'` and `rejection_reason = reason` on the link
6. Sends rejection email with reason to business user (non-critical, try/catch)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] lib/email.ts missing from worktree**
- **Found during:** Task 1 — TypeScript compilation
- **Issue:** The worktree branch diverged before commit 57c97ab (plan 35-03) which added lib/email.ts. The file was absent in the worktree, causing `Cannot find module '@/lib/email'` TS error.
- **Fix:** `git checkout master -- lib/email.ts` to bring the file into the worktree.
- **Files modified:** lib/email.ts (added)
- **Commit:** 2f4e7e9

### Pre-existing Issues (out of scope)

- `resend` package not installed in node_modules — TS2307 error in lib/email.ts line 2. This is an environment setup issue predating this plan. The two new route files compile without errors when lib/email.ts errors are excluded.

## Known Stubs

None — both routes are fully implemented with real DB mutations and email sends.

## Threat Flags

None — endpoints are protected by double-guard (JWT + is_admin). No new unauthenticated surface introduced.

## Self-Check: PASSED

- app/api/admin/approve/route.ts: FOUND
- app/api/admin/reject/route.ts: FOUND
- lib/email.ts: FOUND
- Commit 2f4e7e9: FOUND (git log verified)
- TypeScript errors in new route files: NONE (only pre-existing resend issue in lib/email.ts)
