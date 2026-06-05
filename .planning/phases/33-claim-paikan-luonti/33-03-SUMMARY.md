---
phase: 33-claim-paikan-luonti
plan: "03"
subsystem: api-backend
tags: [route-handler, business-api, supabase, jwt, claim, create-paikka]
dependency_graph:
  requires:
    - 33-01  # DB migrations: business_paikka_links, published, is_claimed columns
  provides:
    - POST /api/business/claim-paikka
    - POST /api/business/create-paikka
  affects:
    - app/business/page.tsx (consumers of these endpoints — Plan 33-05)
    - supabase tables: business_paikka_links, liikuntapaikat
tech_stack:
  added: []
  patterns:
    - JWT verification via supabaseAdmin.auth.getUser (Authorization header)
    - Service role client for RLS-bypassing writes to business tables
    - Atomic insert with rollback pattern (D-10)
    - Denormalized is_claimed flag update (non-critical, no rollback)
key_files:
  created:
    - app/api/business/claim-paikka/route.ts
    - app/api/business/create-paikka/route.ts
  modified: []
decisions:
  - "D-10: Atomic INSERT sequence — liikuntapaikat first, then business_paikka_links; rollback (DELETE) on link insert failure"
  - "D-11: claim-paikka does NOT change published status — claimed venue stays visible"
  - "T-33-03-01/02: user.id always from JWT verification, never from request body"
  - "T-33-03-05: published=false hardcoded in route handler, not read from body"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-05T16:09:49Z"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 0
---

# Phase 33 Plan 03: API Route Handlers — Claim & Create Paikka Summary

**One-liner:** Two JWT-authenticated POST route handlers writing to business_paikka_links via service role key, with 409 on duplicate claim and atomic rollback on create.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create POST /api/business/claim-paikka | 0c2d0c3 | app/api/business/claim-paikka/route.ts |
| 2 | Create POST /api/business/create-paikka | ca026d5 | app/api/business/create-paikka/route.ts |

## What Was Built

### claim-paikka route handler

`app/api/business/claim-paikka/route.ts` — POST endpoint that:
1. Verifies JWT from `Authorization: Bearer <token>` header via `supabaseAdmin.auth.getUser`
2. Parses and validates `paikka_id` as a numeric integer (400 on missing/NaN)
3. Inserts into `business_paikka_links` with `link_type='claim'`, `claim_status='pending'`
4. Returns 409 on PostgreSQL error code `23505` (UNIQUE(paikka_id) violation — venue already claimed)
5. Updates `is_claimed=true` on `liikuntapaikat` (non-critical, logs failure but does not rollback)
6. Does NOT change `published` status per D-11

### create-paikka route handler

`app/api/business/create-paikka/route.ts` — POST endpoint that:
1. Verifies JWT from Authorization header (same pattern)
2. Validates `nimi`, `osoite`, `kaupunki` — each must be a non-empty string after `trim().slice(0, 500)` (400 if any missing)
3. Atomic INSERT sequence (D-10):
   - `INSERT INTO liikuntapaikat` with `published=false`, `business_managed=true`, uses `.select('id').single()` to capture new ID
   - `INSERT INTO business_paikka_links` with `link_type='created'`, `claim_status='pending'`
   - On link insert failure: deletes the newly created liikuntapaikat row (rollback), returns 500
4. Updates `is_claimed=true` on liikuntapaikat (non-critical)
5. Returns `{ ok: true, paikka_id: number }` — paikka_id enables Phase 34 onboarding redirect

## Deviations from Plan

None — plan executed exactly as written.

## Security Mitigations Applied

| Threat ID | Mitigation |
|-----------|------------|
| T-33-03-01 | `user.id` from JWT in claim-paikka — body.user_id never read |
| T-33-03-02 | `user.id` from JWT in create-paikka — body.user_id never read |
| T-33-03-03 | `trim().slice(0, 500)` on all string fields; Supabase parameterized queries prevent SQL injection |
| T-33-03-04 | 409 returned on UNIQUE(paikka_id) violation — not 500 |
| T-33-03-05 | `published=false` hardcoded in INSERT, not read from request body |

## Known Stubs

None.

## Self-Check: PASSED

- `app/api/business/claim-paikka/route.ts` exists: FOUND
- `app/api/business/create-paikka/route.ts` exists: FOUND
- Task 1 commit 0c2d0c3: verified in git log
- Task 2 commit ca026d5: verified in git log
- TypeScript compilation: no errors referencing claim-paikka or create-paikka
