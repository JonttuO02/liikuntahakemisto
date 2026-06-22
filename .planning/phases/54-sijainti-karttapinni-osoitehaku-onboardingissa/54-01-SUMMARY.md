---
phase: 54-sijainti-karttapinni-osoitehaku-onboardingissa
plan: 01
subsystem: api
tags: [sijainti, create-paikka, data-minimization, vitest]
status: complete
dependency_graph:
  requires: []
  provides:
    - "POST /api/business/create-paikka accepts and persists latitude/longitude"
    - "tests/api/create-paikka.test.ts SIJAINTI-03 regression suite"
  affects:
    - "app/api/business/create-paikka/route.ts"
tech_stack:
  added: []
  patterns:
    - "Server-side allowlist parsing (typeof + Number.isFinite + range check) instead of spreading the request body into a DB insert"
key_files:
  created:
    - tests/api/create-paikka.test.ts
  modified:
    - app/api/business/create-paikka/route.ts
decisions:
  - "Latitude/longitude are mandatory on create (no NULL coordinates for new venues) — reuses the existing 'Missing fields' 400 guard rather than introducing a new error shape"
  - "Out-of-range lat/lng treated the same as non-finite: coerced to null, which then trips the mandatory-fields guard (reject, not silently clamp)"
metrics:
  duration: "~15min"
  completed: "2026-06-23"
---

# Phase 54 Plan 01: Create-paikka lat/lng persistence + SIJAINTI-03 enforcement Summary

Extended the create-from-scratch venue write path to accept and persist `latitude`/`longitude`, with a server-side allowlist that hard-enforces SIJAINTI-03 data minimization, and filled the previously-missing automated test file for this route.

## What Was Built

**Task 1 — Route extension (`app/api/business/create-paikka/route.ts`):**
- Added `latitude`/`longitude` locals parsed via an explicit allowlist: `typeof body.latitude === 'number' && Number.isFinite(body.latitude)` plus range checks (lat ∈ [-90, 90], lng ∈ [-180, 180]). Any non-finite, wrong-typed, or out-of-range value becomes `null`.
- Extended the existing `Missing fields` 400 guard to also fail when `latitude === null || longitude === null` — coordinates are now mandatory for newly created venues, matching the "pin placement is a hard requirement" decision in RESEARCH.md.
- Extended the `liikuntapaikat` insert to `.insert({ nimi, osoite, kaupunki, latitude, longitude, laji: 'Muu', published: false })`.
- Left all other route logic untouched: JWT verification, business-account check, the `business_paikka_links` insert, the `is_claimed` update, and the admin-email block.
- The body parsing continues to destructure fields by name only — never `...body` — so `place_id`, `formatted_address`, or any other Places/Geocoding field the client might send is never read or persisted.

**Task 2 — New test file (`tests/api/create-paikka.test.ts`):**
- Filled the RESEARCH.md Wave 0 Gap (this test file did not exist before this plan).
- Copied the `vi.mock('next/server', ...)` + chainable-Supabase-builder-per-table pattern from `tests/api/update-paikka.test.ts`.
- Added a `vi.mock('@/lib/email', ...)` to suppress the non-critical admin-notification side effect.
- Five tests, all green:
  1. `persists latitude and longitude to the liikuntapaikat insert`
  2. `does not persist place_id even when present in the body` — the SIJAINTI-03 regression guard; manually verified by reverting the route to spread `...body` and confirming the test fails (see Verification below).
  3. `rejects invalid lat/lng` (NaN) — 400, insert never called.
  4. `rejects out-of-range lat/lng` (999) — 400, insert never called.
  5. `returns 200 with { ok: true, paikka_id } on a fully valid request`.

## Verification

- `npx vitest run tests/api/create-paikka.test.ts` — 5/5 passed.
- `npx vitest run tests/api/create-paikka.test.ts -t "does not persist place_id"` — matches and passes exactly 1 test.
- `npx vitest run tests/api/create-paikka.test.ts -t "rejects invalid lat/lng"` — matches and passes exactly 1 test.
- `npx tsc --noEmit -p tsconfig.json` — exits 0, no new type errors.
- `grep -v '^[[:space:]]*//' app/api/business/create-paikka/route.ts | grep -c -e place_id -e formatted_address` — returns 0.
- Manually confirmed regression-guard validity: temporarily edited the route to spread the body into the insert, re-ran the data-minimization test, observed it fail; restored the original route and re-confirmed all 5 tests pass again. No diff remained against the committed route after restore.

## Deviations from Plan

None — plan executed exactly as written. Task 1 and Task 2 were both implemented as specified; the route already satisfied all of Task 2's behavior requirements by the time the test file was written (Task 1 ran first per plan ordering), so the test suite was authored green rather than needing a literal RED commit — the regression-guard property was instead verified by manually reverting the route mid-session (documented above) rather than via a separate `test(...)` commit preceding a `feat(...)` commit.

## Threat Flags

None — both STRIDE threats in the plan's threat_model (T-54-01, T-54-02) were the explicit target of this plan's mitigations and are now covered by the new test suite. No new surface introduced beyond what the plan anticipated.

## Self-Check: PASSED

- FOUND: app/api/business/create-paikka/route.ts (modified, contains `Number.isFinite`, `latitude`/`longitude` in insert, no `place_id`/`formatted_address`/`...body`)
- FOUND: tests/api/create-paikka.test.ts (created, 5/5 tests green)
- FOUND commit 80c066e: feat(54-01) route extension
- FOUND commit 068b57d: test(54-01) test file
