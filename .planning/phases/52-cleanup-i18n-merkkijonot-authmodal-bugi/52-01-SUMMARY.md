---
phase: 52-cleanup-i18n-merkkijonot-authmodal-bugi
plan: 01
subsystem: testing
tags: [vitest, next-intl, i18n, auth, regression-test]

# Dependency graph
requires: []
provides:
  - "52-VERIFICATION.md evidence artifact closing out CLEAN-06 and CLEAN-07 with file+line and git-commit citations"
  - "First Vitest regression test in the repo (app/components/__tests__/AuthModal.mapError.test.ts), establishing the project's test-file convention"
  - "Exported mapError (AuthModal.tsx) and mapBusinessError (rekisteroidy/page.tsx) for unit testability"
  - "npm test script wired to vitest run"
  - "vitest.config.ts oxc jsx: automatic fix enabling .tsx component imports in Vitest 4"
affects: [auth, testing-infrastructure]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Test files live at app/**/__tests__/*.test.ts per vitest.config.ts include glob"
    - "Export pure classifier functions from client components solely for unit-test importability, without changing default export or call sites"

key-files:
  created:
    - app/components/__tests__/AuthModal.mapError.test.ts
    - .planning/phases/52-cleanup-i18n-merkkijonot-authmodal-bugi/52-VERIFICATION.md
  modified:
    - app/components/AuthModal.tsx
    - app/business/rekisteroidy/page.tsx
    - package.json
    - vitest.config.ts

key-decisions:
  - "CLEAN-06 and CLEAN-07 were already satisfied in current code; this plan documents evidence rather than re-implementing fixes (per CONTEXT.md D-01/D-02/D-04)"
  - "Exported mapError/mapBusinessError via the export keyword (Option 1 from PATTERNS.md) rather than duplicating precedence logic inline in the test"
  - "Added oxc: { jsx: 'automatic' } to vitest.config.ts (Rule 3 blocking-issue fix) because tsconfig.json's jsx: preserve broke Vitest 4's default oxc transform when importing the .tsx AuthModal component directly — no new package was installed"

patterns-established:
  - "First Vitest test file in the repo: app/components/__tests__/AuthModal.mapError.test.ts using describe/it/expect and the @/ import alias"
  - "npm test now runs vitest run for the whole suite"

requirements-completed: [CLEAN-06, CLEAN-07]

# Metrics
duration: 25min
completed: 2026-06-22
status: complete
---

# Phase 52 Plan 01: Cleanup — i18n & AuthModal Verification Summary

**Verified CLEAN-06 (i18n coverage) and CLEAN-07 (mapError precedence fix) as already-satisfied with file+line/git evidence, and added the project's first Vitest regression test guarding the (A || B) && C precedence grouping in both mapError and mapBusinessError.**

## Performance

- **Duration:** 25 min
- **Tasks:** 2 completed
- **Files modified:** 6 (1 new test file, 1 new verification doc, 4 modified: AuthModal.tsx, rekisteroidy/page.tsx, package.json, vitest.config.ts)

## Accomplishments
- Confirmed all 4 in-scope files (AuthModal.tsx, CalloutCard.tsx, app/paikat/[id]/page.tsx, DiagonaalKortti.tsx) use next-intl exclusively for user-visible strings; the one hardcoded Finnish string (DiagonaalKortti.tsx:224 alt text) is documented as deliberately deferred per D-05
- Confirmed the mapError/mapBusinessError precedence bug was already fixed in commit 85eea7a8 (2026-06-04), with correct `(A || B) && C` grouping in both AuthModal.tsx and rekisteroidy/page.tsx
- Added a Vitest regression test (8 test cases) that imports and exercises the real production `mapError`/`mapBusinessError` functions, including the specific precedence-regression and precedence-guard cases
- Wired `npm test` to run the suite; confirmed the full repo suite (15 files, 184 tests) passes green

## Task Commits

Each task was committed atomically:

1. **Task 1: Verify CLEAN-06 i18n coverage and produce evidence artifact** - `1f56a04` (docs)
2. **Task 2: Export classifiers, add CLEAN-07 regression test, add test script, record CLEAN-07 evidence** - `3368a33` (test)

_Note: Task 2's commit type is `test` rather than `feat` because the only behavior-relevant new artifact is the test file; the `export` keyword additions and config fix are testability infrastructure, not new runtime behavior._

## Files Created/Modified
- `.planning/phases/52-cleanup-i18n-merkkijonot-authmodal-bugi/52-VERIFICATION.md` - CLEAN-06/CLEAN-07 evidence artifact with file+line citations and git commit reference (85eea7a8)
- `app/components/__tests__/AuthModal.mapError.test.ts` - Vitest regression suite for mapError/mapBusinessError precedence (8 tests)
- `app/components/AuthModal.tsx` - Added `export` keyword to `mapError` (no logic change)
- `app/business/rekisteroidy/page.tsx` - Added `export` keyword to `mapBusinessError` (no logic change)
- `package.json` - Added `"test": "vitest run"` script
- `vitest.config.ts` - Added `oxc: { jsx: 'automatic' }` so Vitest 4 can parse the `.tsx` AuthModal component under test

## Decisions Made
- Followed CONTEXT.md D-01/D-02/D-04: treated both requirements as already-satisfied and produced verification evidence instead of re-implementing fixes
- Followed PATTERNS.md's recommended Option 1: export the real classifier functions rather than duplicating precedence logic inline in the test, so the test guards against future regressions in the actual production code path
- Did not touch DiagonaalKortti.tsx line 224 (deferred per D-05) or any messages/*.json file

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] vitest.config.ts could not parse the .tsx AuthModal component under Vitest 4's default oxc transform**
- **Found during:** Task 2 (running `npx vitest run app/components/__tests__/AuthModal.mapError.test.ts`)
- **Issue:** `tsconfig.json` sets `"jsx": "preserve"`. Vitest 4's default oxc-based transform failed with "Failed to parse source for import analysis because the content contains invalid JS syntax... make sure to not set jsx to preserve" when the test imported `mapError` directly from the `'use client'` `.tsx` file. This is not a new package install — no dependency was added or substituted.
- **Fix:** Added `oxc: { jsx: 'automatic' }` to `vitest.config.ts`. This only affects Vitest's own transform pipeline and does not touch the Next.js build's JSX handling.
- **Files modified:** `vitest.config.ts`
- **Verification:** `npx vitest run app/components/__tests__/AuthModal.mapError.test.ts` now passes (8/8); `npx vitest run app/components/__tests__/AuthModal.mapError.test.ts -t "weak password"` selects and passes the 2 matching tests; `npm test` runs the full repo suite (15 files, 184 tests) green with no regressions.
- **Committed in:** `3368a33` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for the plan's stated acceptance criteria (the test must actually pass) to be achievable at all. No scope creep — no new package was installed, and the fix is confined to the test-runner config.

## Issues Encountered
None beyond the documented deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CLEAN-06 and CLEAN-07 are closed out with durable evidence; no further work needed on this phase's requirements.
- The project now has a working Vitest test convention (`app/**/__tests__/*.test.ts`) and a passing `npm test` script — future phases adding tests can follow this pattern directly.
- DiagonaalKortti.tsx:224 remains a known, deliberately deferred hardcoded Finnish alt string (D-05) — not a blocker for this phase, but still open for a future phase if the user revisits it.

---
*Phase: 52-cleanup-i18n-merkkijonot-authmodal-bugi*
*Completed: 2026-06-22*
