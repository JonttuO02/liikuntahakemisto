---
phase: 34-onboarding-velhou
plan: 01
subsystem: onboarding-utils
tags: [pure-functions, unit-tests, vitest, tdd]
dependency_graph:
  requires: []
  provides:
    - lib/onboardingUtils.ts exports buildDraftAsPaikka, hinnastaToHintaKuvaus, FI_TO_EN, ORDERED_DAYS
    - vitest.config.ts covers tests/**/*.test.ts glob
  affects:
    - Plans 34-04 (StepEsikatselu), 34-06 (StepAukioloajat), 34-07 (save-step), 34-09 (submit Route Handler)
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN flow with vitest
    - Pure function utility library (no Supabase imports)
key_files:
  created:
    - lib/onboardingUtils.ts
    - lib/onboardingUtils.test.ts
  modified:
    - vitest.config.ts
decisions:
  - buildDraftAsPaikka accepts PaikkaBase (not full Liikuntapaikka) to stay compatible with the onboarding_draft join shape
  - hinnastaToHintaKuvaus trims lisatieto before formatting to prevent trailing whitespace in output
  - ORDERED_DAYS and FI_TO_EN exported from onboardingUtils.ts (not re-exported from lib/aukiolo.ts) to keep them available to wizard components without pulling in aukiolo.ts's getOpenStatus logic
metrics:
  duration: "~7 minutes"
  completed: "2026-06-06"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
---

# Phase 34 Plan 01: Onboarding Utility Library — Summary

Pure-function utility library `lib/onboardingUtils.ts` with `buildDraftAsPaikka` and `hinnastaToHintaKuvaus`, plus comprehensive unit tests covering ONBOARD-04 through ONBOARD-07 behaviors; vitest extended to include `tests/**/*.test.ts` glob.

## What Was Built

### lib/onboardingUtils.ts

Exports two pure transformation functions and two constants needed by downstream wizard components:

- `hinnastaToHintaKuvaus(hinnasto)` — serializes wizard pricing rows into the newline-separated `hinta_kuvaus` TEXT format consumed by `lib/priceUtils.ts`. Filters rows with empty `hinta`, formats `"Kategoria: hinta€ (lisätieto)"`, joins with `\n`. Returns `''` when no rows have a non-empty hinta (ONBOARD-04 gate).
- `buildDraftAsPaikka(draft, paikka)` — maps `OnboardingDraft` + `PaikkaBase` to a full `Liikuntapaikka` object for Step 6 preview rendering. Covers all required type fields (ONBOARD-07).
- `FI_TO_EN` — Finnish abbreviation to English day key mapping, preventing Pitfall 5 (aukioloajat key mismatch).
- `ORDERED_DAYS` — ordered English day keys matching `lib/aukiolo.ts`.
- `OnboardingDraft` and `PaikkaBase` type exports for use by wizard step components.

No Supabase imports. No Next.js imports. No DOM dependencies.

### lib/onboardingUtils.test.ts

21 unit tests covering:
- `hinnastaToHintaKuvaus`: empty input, empty hinta filter, single row, lisatieto formatting, multi-row join (ONBOARD-04)
- `buildDraftAsPaikka`: id assignment, hinta_min/max null, image_url from photos[0], image_url null fallback, aukioloajat draft priority, paikka aukioloajat fallback, kuvaus/website/featured fields, full field mapping (ONBOARD-07)
- `FI_TO_EN`: Ma/La/Su mappings (ONBOARD-05)
- maxLength: 300-char boundary check (ONBOARD-06)

### vitest.config.ts

Added `'tests/**/*.test.ts'` to the `include` array. Full suite now covers `lib/**`, `app/**/__tests__/**`, and `tests/**`.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test) | bb0eba4 | PASS — test suite failed with "Cannot find module" as expected |
| GREEN (feat) | e33b0d8 | PASS — 21/21 tests passed |
| REFACTOR | n/a | No refactor needed |

## Verification

- `npx vitest run lib/onboardingUtils.test.ts` — 21/21 passed
- `npx vitest run` (full suite) — 102/102 passed (10 test files)
- `grep -c "export function buildDraftAsPaikka" lib/onboardingUtils.ts` returns 1
- `grep -c "export function hinnastaToHintaKuvaus" lib/onboardingUtils.ts` returns 1
- No Supabase imports in lib/onboardingUtils.ts

## Commits

| Hash | Type | Description |
|------|------|-------------|
| bb0eba4 | test | add failing tests for onboardingUtils (RED) |
| e33b0d8 | feat | implement buildDraftAsPaikka and hinnastaToHintaKuvaus (GREEN) |
| 6ebe64b | chore | add tests/**/*.test.ts glob to vitest.config.ts |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. `lib/onboardingUtils.ts` is a complete pure-function implementation with no placeholder return values or TODOs.

## Threat Flags

None. `lib/onboardingUtils.ts` introduces no network endpoints, no auth paths, no file access, and no schema changes. All functions are pure transformations with no I/O.

## Self-Check: PASSED

- lib/onboardingUtils.ts: FOUND
- lib/onboardingUtils.test.ts: FOUND
- vitest.config.ts (modified): FOUND
- bb0eba4 (RED commit): FOUND
- e33b0d8 (GREEN commit): FOUND
- 6ebe64b (vitest.config commit): FOUND
