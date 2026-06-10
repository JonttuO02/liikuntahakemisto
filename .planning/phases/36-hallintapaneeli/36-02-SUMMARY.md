---
phase: 36
plan: "02"
subsystem: api
tags: [route-handler, auth, business, update-paikka]
dependency_graph:
  requires: []
  provides: [POST /api/business/update-paikka]
  affects: [liikuntapaikat]
tech_stack:
  added: []
  patterns: [JWT-bearer-auth, ownership-check-via-business_paikka_links, section-based-field-mapping]
key_files:
  created:
    - app/api/business/update-paikka/route.ts
  modified: []
decisions:
  - Used maybeSingle() for ownership query to avoid throwing on no-row (vs single() which errors)
  - photo_urls defaults to empty array when absent, logo_url defaults to null for consistent nullability
  - yhteystiedot fields use undefined for absent values so Supabase ignores unset columns on update
metrics:
  duration: "49s"
  completed: "2026-06-10T20:26:23Z"
  tasks_completed: 1
  files_created: 1
  files_modified: 0
---

# Phase 36 Plan 02: Route Handler — POST /api/business/update-paikka Summary

**One-liner:** JWT-authenticated POST handler with per-section field mapping writes business edits directly to `liikuntapaikat` after ownership verification via `business_paikka_links`.

## What Was Built

Created `app/api/business/update-paikka/route.ts` — a Next.js Route Handler that:

1. **Auth layer** — reads `Authorization: Bearer <token>`, calls `supabaseAdmin.auth.getUser(token)`. Returns 401 if missing or invalid. Mirrors `register/route.ts` exactly.

2. **Ownership check** — queries `business_paikka_links` via supabaseAdmin for `(business_account_id = user.id AND paikka_id = paikka_id)`. Returns 403 if no matching row.

3. **Section routing** — four sections with distinct field validation:
   - `mediat`: accepts `logo_url` + `photo_urls` (array, max 5 items enforced — returns 400 otherwise)
   - `hinnasto`: accepts `hinta_min`, `hinta_max`, `hinta_kuvaus` with type checks (number or null only)
   - `aukioloajat`: passes `data` directly as JSONB to `aukioloajat` column
   - `yhteystiedot`: trims `puhelin`, `varauslinkki`, `kuvaus`; caps `kuvaus` at 300 chars
   - Unknown section: returns 400

4. **DB write** — `supabaseAdmin.from('liikuntapaikat').update(updatePayload).eq('id', paikka_id)`. Returns 500 on Supabase error, 200 `{ ok: true }` on success.

## Acceptance Criteria Status

- [x] File exists and exports named `POST` function
- [x] No Authorization header → HTTP 401
- [x] Valid token but paikka_id not linked to user → HTTP 403
- [x] photo_urls with more than 5 items → HTTP 400
- [x] Unknown section value → HTTP 400
- [x] `npx tsc --noEmit` passes (clean, no output)

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| fe91fa6 | feat(36-02): add POST /api/business/update-paikka Route Handler |

## Self-Check: PASSED

- [x] `app/api/business/update-paikka/route.ts` — FOUND
- [x] Commit fe91fa6 — FOUND (`git log --oneline -1` confirms)
