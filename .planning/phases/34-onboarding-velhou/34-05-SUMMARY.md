---
phase: 34-onboarding-velhou
plan: "05"
subsystem: api
tags: [route-handler, onboarding, jwt, supabase-admin, atomic-commit]
dependency_graph:
  requires:
    - "34-04"  # DB migration (onboarding_draft table + onboarding_completed column)
  provides:
    - "POST /api/business/onboarding/save-step — per-step draft UPSERT"
    - "POST /api/business/onboarding/submit — atomic draft→liikuntapaikat commit"
    - "lib/onboardingUtils.hinnastaToHintaKuvaus() — testable utility"
  affects:
    - "34-06 through 34-09 — wizard client components consume these endpoints"
    - "34-10 — utility functions testable via vitest"
tech_stack:
  added: []
  patterns:
    - "JWT-verified supabaseAdmin UPSERT (same as claim-paikka / create-paikka)"
    - "Atomic multi-step Route Handler with draft preservation on error"
    - "ownership check via business_paikka_links before liikuntapaikat write"
key_files:
  created:
    - app/api/business/onboarding/save-step/route.ts
    - app/api/business/onboarding/submit/route.ts
    - lib/onboardingUtils.ts
  modified: []
decisions:
  - "lib/onboardingUtils.ts created here (not in a later plan) because submit/route.ts imports hinnastaToHintaKuvaus at build time — deferring to plan 10 would cause TypeScript errors in wave 2"
  - "hinnastaToHintaKuvaus exposed as named export for unit testing in plan 10"
  - "onboarding_completed UPDATE in submit is non-critical — logged but not fatal; venue data already live after liikuntapaikat UPDATE succeeds"
metrics:
  duration_minutes: 12
  completed_date: "2026-06-06"
  tasks_completed: 2
  files_created: 3
  files_modified: 0
---

# Phase 34 Plan 05: Onboarding API Route Handlers Summary

JWT-verified Route Handlers for onboarding wizard persistence — save-step UPSERT to onboarding_draft and atomic submit that copies draft to liikuntapaikat with ownership verification.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create save-step Route Handler + onboardingUtils | db6af47 | app/api/business/onboarding/save-step/route.ts, lib/onboardingUtils.ts |
| 2 | Create submit Route Handler (atomic commit) | e4519ea | app/api/business/onboarding/submit/route.ts |

## What Was Built

### POST /api/business/onboarding/save-step

Handles per-step draft persistence for wizard steps 1–6. Accepts `{ paikka_id, step, field, value }` where `field` must be one of `media_urls | hinnasto | aukioloajat | yhteystiedot`. UPSERTs to `onboarding_draft` keyed on `(business_account_id, paikka_id)`. The `business_account_id` is always sourced from the verified JWT — never from the request body (T-34-05-02 mitigated).

### POST /api/business/onboarding/submit

Atomic draft-to-liikuntapaikat commit. Sequence:
1. JWT verification
2. Fetch draft with liikuntapaikat join
3. **Ownership check** — verifies `business_paikka_links(user.id, paikka_id)` → 403 if absent (T-34-05-01 mitigated)
4. Build `hinta_kuvaus` via `hinnastaToHintaKuvaus()`
5. Update `liikuntapaikat` (hinta_kuvaus, aukioloajat, kuvaus, puhelin, varauslinkki, image_url, business_managed=true)
6. Set `onboarding_completed = true` in `business_accounts` (non-critical)
7. Delete draft (only after step 5 succeeds — draft preserved for retry on error)

### lib/onboardingUtils.ts

Pure utility with `HinnanRivi` type and `hinnastaToHintaKuvaus()` function. Converts wizard hinnasto JSONB array to the newline-separated `hinta_kuvaus` TEXT format that `priceItemList()` in `lib/priceUtils.ts` expects.

## Deviations from Plan

### Auto-added: lib/onboardingUtils.ts (Rule 2 — Missing Critical Functionality)

**Found during:** Task 1 planning
**Issue:** The submit route imports `hinnastaToHintaKuvaus` from `@/lib/onboardingUtils`. This file does not exist and is not listed in plan 05's `files_modified`. Without it, TypeScript compilation would fail for both plan 05 (submit route) and future plan 10 (unit tests).
**Fix:** Created `lib/onboardingUtils.ts` with `HinnanRivi` type and `hinnastaToHintaKuvaus()` as named exports. Committed alongside save-step/route.ts in Task 1.
**Files modified:** lib/onboardingUtils.ts (new)
**Commit:** db6af47

## Threat Mitigations Applied

| Threat ID | Mitigation | Location |
|-----------|-----------|----------|
| T-34-05-01 | `business_paikka_links` ownership check before liikuntapaikat UPDATE; 403 if absent | submit/route.ts step 3 |
| T-34-05-02 | `business_account_id` in UPSERT always set to `user.id` from JWT; body value ignored | save-step/route.ts + comment |
| T-34-05-03 | save-step only writes to onboarding_draft (no liikuntapaikat writes); submit verifies ownership | both routes |
| T-34-05-04 | Accepted — Supabase 8KB row limit + Next.js 4MB body limit sufficient | — |

## Known Stubs

None. Both routes perform real DB operations. The utility function `hinnastaToHintaKuvaus` is fully implemented.

## Threat Flags

None. No new network endpoints beyond the two planned in this plan.

## Self-Check: PASSED

- app/api/business/onboarding/save-step/route.ts: FOUND
- app/api/business/onboarding/submit/route.ts: FOUND
- lib/onboardingUtils.ts: FOUND
- Commit db6af47: verified (Task 1)
- Commit e4519ea: verified (Task 2)
- TypeScript: npx tsc --noEmit → 0 errors
