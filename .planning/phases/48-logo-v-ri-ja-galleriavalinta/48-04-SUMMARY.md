---
phase: 48-logo-v-ri-ja-galleriavalinta
plan: 04
subsystem: ui
tags: [onboarding, wizard, branding, react, nextjs]

# Dependency graph
requires:
  - phase: 48-logo-v-ri-ja-galleriavalinta (plans 01-03)
    provides: handleConfirm save-step wiring, StepEsikatselu brandColor logic, AnalysoiSivusto role-aware color pattern
provides:
  - "Jatka velhoon → continuation path that lands on Step 2 (Media) instead of skipping it"
  - "Role-aware brandColor fallback in StepEsikatselu matching AnalysoiSivusto's own initialization"
affects: [49-esikatselu-ja-kontrastikorjaukset]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "save-step step number is one less than the resulting current_step (step+1 arithmetic) — always trace through WizardInner's auto-resume condition before changing save-step step values"
    - "Color array fallbacks must select by semantic role field, never by array index, when colors carry a role tag"

key-files:
  created: []
  modified:
    - app/business/onboarding/page.tsx
    - app/business/onboarding/StepEsikatselu.tsx

key-decisions:
  - "Changed handleConfirm save-step body step:2 -> step:1 so current_step becomes 2, matching WizardInner's savedStep>1 && step===1 resume condition that redirects to StepMediat (Step 2)"
  - "Changed StepEsikatselu brandColor fallback from colors?.[0]?.hex to colors?.find(c => c.role === 'background')?.hex, mirroring AnalysoiSivusto's bgCandidate pattern"

patterns-established: []

requirements-completed: [ONBOARD-16, ONBOARD-14, ONBOARD-15]

# Metrics
duration: 10min
completed: 2026-06-17
---

# Phase 48 Plan 04: Gap Closure (CR-01 step-skip + CR-02 role-aware color) Summary

**Fixed two single-expression regressions: the onboarding wizard now lands on Step 2 (Media) after analysis instead of skipping past it, and the Step 6 preview background color is selected by semantic role instead of array position.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-17
- **Completed:** 2026-06-17
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- CR-01 fixed: `handleConfirm`'s save-step body now writes `step: 1`, so the save-step route's `current_step = step + 1` arithmetic yields `current_step: 2`, and `WizardInner`'s auto-resume (`savedStep > 1 && step === 1`) redirects users to `?step=2` (StepMediat) instead of `?step=3` (StepHinnasto) — restoring the path where prefilled gallery images and logo are selectable.
- CR-02 fixed: `StepEsikatselu.tsx`'s `brandColor` fallback now uses `colors?.find(c => c.role === 'background')?.hex` instead of `colors?.[0]?.hex`, ensuring the Step 6 `DiagonaalKortti` preview background uses a color whose semantic role is actually 'background', mirroring `AnalysoiSivusto.tsx`'s own initialization logic.
- Both fixes preserve all surrounding behavior: the `await`-before-`setPagePhase` race fix (T-48-15) is untouched, and the explicit-selection path (`selected_background_color` already set) is unchanged.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix CR-01 — handleConfirm writes step:1 so the wizard lands on Step 2 (Media), not past it** - `7c25638` (fix)
2. **Task 2: Fix CR-02 — StepEsikatselu brandColor fallback is role-aware (background-role), mirroring AnalysoiSivusto** - `556c5a8` (fix)

**Plan metadata:** (pending — final docs commit)

## Files Created/Modified
- `app/business/onboarding/page.tsx` - `handleConfirm`'s save-step fetch body changed `step: 2` → `step: 1`; comment updated to explain the step+1 resume arithmetic
- `app/business/onboarding/StepEsikatselu.tsx` - `brandColor` fallback changed `colors?.[0]?.hex` → `colors?.find(c => c.role === 'background')?.hex`; comment updated to describe the role-aware fallback

## Decisions Made
- Confirmed via `AnalysoiSivusto.tsx` (line 145) and `lib/branding/brandingResult.ts` (line 36, `colors: Array<{ hex: string; role: string }>`) that the `role` field is already typed and used without a cast elsewhere — no `any` cast needed for the CR-02 fix.
- Verified `WizardInner.tsx`'s auto-resume condition (`savedStep > 1 && step === 1`) confirms the CR-01 fix produces the intended redirect to Step 2, not Step 3.

## Deviations from Plan

None - plan executed exactly as written. Both edits were the exact single-expression changes specified in the plan's `<action>` blocks.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 48 success criteria fully restored: ROADMAP Success Criterion 3 (gallery images selectable in Mediat step) and the phase goal's "explicitly choose what represents their brand" guarantee are both closed.
- `npx tsc --noEmit` is clean across the whole project after both edits.
- No new public symbols, files, types, exports, routes, or schema changes were introduced — Phase 49 (Esikatselu- ja kontrastikorjaukset) can proceed without any interface changes from this plan.

---
*Phase: 48-logo-v-ri-ja-galleriavalinta*
*Completed: 2026-06-17*

## Self-Check: PASSED

- FOUND: .planning/phases/48-logo-v-ri-ja-galleriavalinta/48-04-SUMMARY.md
- FOUND: 7c25638 (Task 1 commit)
- FOUND: 556c5a8 (Task 2 commit)
