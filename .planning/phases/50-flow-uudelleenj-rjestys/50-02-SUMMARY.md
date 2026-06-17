---
phase: 50-flow-uudelleenj-rjestys
plan: 02
subsystem: ui
tags: [nextjs, react, onboarding-wizard, supabase]

# Dependency graph
requires:
  - phase: 50-flow-uudelleenj-rjestys (plan 01)
    provides: Migrated current_step values in onboarding_draft rows and a save-step route accepting input step 0-5
provides:
  - StepPaikka rendered as a page-level pre-phase before AnalysoiSivusto's website-analysis step
  - A 5-step OnboardingMode wizard (StepMediat=1 ... StepEsikatselu=5) with StepPaikka removed
  - Working back-navigation from the wizard's first step (StepMediat) back to the AnalysoiSivusto pre-phase
  - A 5-entry ProgressBar with no Place-name label
affects: [business-onboarding, wizard-navigation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Page-level 3-phase router (paikka -> analyze -> wizard) replacing the prior 2-phase (pre -> wizard) router in app/business/onboarding/page.tsx"
    - "Wizard step 1 onPrev now navigates a phase up the page-level router instead of attempting an in-wizard goToStep(0) that no longer exists"

key-files:
  created: []
  modified:
    - app/business/onboarding/page.tsx
    - app/business/WizardInner.tsx
    - app/business/onboarding/StepMediat.tsx
    - app/business/onboarding/StepHinnasto.tsx
    - app/business/onboarding/StepAukioloajat.tsx
    - app/business/onboarding/StepYhteystiedot.tsx
    - app/business/onboarding/AnalysoiSivusto.tsx
    - app/business/onboarding/ProgressBar.tsx

key-decisions:
  - "Task 4's human-verify checkpoint surfaced a real bug (wizard step 1 back-button was a dead-end) rather than only confirming the plan as written; the orchestrator fixed it (commit 31714be) and the user re-verified before the plan was marked complete"
  - "UAT feedback unrelated to this plan's scope (preview-in-analyze-step, AI color-picking, photo display in DiagonaalKortti/sheet, placeholder text styling, CalloutCard visualization) was explicitly deferred to other phases (47-49 bug fixes or phase 51 live-preview work) per user decision during the checkpoint — not silently dropped, and not addressed in this plan"

patterns-established:
  - "When a wizard's first in-wizard step needs a 'back' action that lands outside the wizard (in a page-level pre-phase), wire onPrev through a callback passed down from the page component rather than an in-wizard goToStep call to a step number that no longer exists"

requirements-completed: [FLOW-01, FLOW-04]

# Metrics
duration: ~45min (across initial execution + checkpoint fix-and-reverify cycle)
completed: 2026-06-17
---

# Phase 50 Plan 02: Onboarding flow reorder Summary

**StepPaikka moved to a page-level pre-phase before website analysis; wizard renumbered to 5 steps (StepMediat=1 ... StepEsikatselu=5); wizard step-1 back-button rewired to return to the analyze pre-phase after a UAT-caught dead-end bug.**

## Performance

- **Duration:** ~45 min
- **Tasks:** 4 (3 auto tasks + 1 human-verify checkpoint that surfaced and required a fix)
- **Files modified:** 8

## Accomplishments
- `app/business/onboarding/page.tsx` is now a 3-phase router: `paikka` (StepPaikka) -> `analyze` (AnalysoiSivusto) -> `wizard`, implementing FLOW-01 (venue confirmation before URL analysis)
- `app/business/WizardInner.tsx`'s `OnboardingMode` renumbered to a 5-step wizard (StepMediat=1, StepHinnasto=2, StepAukioloajat=3, StepYhteystiedot=4, StepEsikatselu=5), StepPaikka removed from the wizard entirely
- All five step-literal callers (StepMediat, StepHinnasto, StepAukioloajat, StepYhteystiedot, AnalysoiSivusto's handleQuickAccept) and ProgressBar updated to match the 50-01-migrated `current_step` numbering (FLOW-04, app side)
- ProgressBar now shows 5 labels (Media, Pricing, Hours, Contact, Preview) with no Place-name entry; the `stepPlaceName` i18n key is preserved for StepPaikka's own heading
- User performed two rounds of live manual verification: (1) confirmed the reordered flow (StepPaikka -> analyze -> 5-step wizard) works correctly, (2) after the back-button fix, confirmed wizard step 1's "back" button correctly returns to the analyze pre-phase instead of dead-ending

## Task Commits

Each task was committed atomically:

1. **Task 1: Move StepPaikka into page.tsx as a pre-phase; extend PagePhase to 3 phases** - `c990d82` (feat)
2. **Task 2: Remove StepPaikka from WizardInner and renumber the 5 wizard steps** - `6e43972` (feat)
3. **Task 3: Shift step literals in the 4 Step components + AnalysoiSivusto; drop ProgressBar's first label** - `1d269b8` (feat)
4. **Task 4 fix: Wire wizard step 1 back-button to return to analyze pre-phase** - `31714be` (fix, discovered during the Task 4 human-verify checkpoint)

**Plan metadata:** this commit (docs: create plan summary)

## Files Created/Modified
- `app/business/onboarding/page.tsx` - 3-phase page router (paikka -> analyze -> wizard); `StepPaikkaPrePhase` wrapper resolving paikka_id/paikkaInfo; `handleConfirm` sends `step: 0`; passes a callback into the wizard so its step-1 back-button can return to the `analyze` phase
- `app/business/WizardInner.tsx` - `OnboardingMode` renumbered to 5 steps with StepPaikka removed; step bounds `rawStep > 5`; preview re-fetch guard `step !== 5`; step-1 (StepMediat) `onPrev` now invokes the page-level callback instead of an invalid in-wizard `goToStep(0)`; EditMode untouched
- `app/business/onboarding/StepMediat.tsx` - save-step body `step: 1`
- `app/business/onboarding/StepHinnasto.tsx` - save-step body `step: 2`
- `app/business/onboarding/StepAukioloajat.tsx` - save-step body `step: 3`
- `app/business/onboarding/StepYhteystiedot.tsx` - save-step body `step: 4`
- `app/business/onboarding/AnalysoiSivusto.tsx` - `handleQuickAccept` save-step body `step: 5`
- `app/business/onboarding/ProgressBar.tsx` - `stepLabels` reduced to 5 entries, `stepPlaceName` label dropped (i18n key preserved elsewhere)

## Decisions Made
- The Task 4 checkpoint was treated as a real verification gate, not a rubber stamp: when the user found the wizard's step-1 back-button dead-ending, the fix was implemented and the user re-verified live before the plan was allowed to complete.
- Other UAT feedback collected during the same session (missing live preview in the analyze step, AI color-picking bugs, photos not rendering in DiagonaalKortti/sheet, placeholder text styling, CalloutCard visualization issues) was explicitly scoped OUT of this plan per user instruction — these are tracked for other phases (47-49 bug-fix follow-ups or Phase 51's live-preview work), not addressed here, and not silently dropped.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wizard step 1 back-button was a no-op / dead end**
- **Found during:** Task 4 (human-verify checkpoint)
- **Issue:** After Tasks 1-3 removed StepPaikka from the wizard and renumbered steps, StepMediat (now step 1) retained an `onPrev` wired to an in-wizard `goToStep` call targeting a step number that no longer existed (the old StepPaikka slot). Clicking "back" on the wizard's first step did nothing instead of returning the user to the AnalysoiSivusto pre-phase.
- **Fix:** Wired the wizard's step-1 `onPrev` through a callback passed down from `page.tsx`, so clicking back on StepMediat sets the page-level phase back to `analyze`, returning the user to AnalysoiSivusto.
- **Files modified:** `app/business/WizardInner.tsx`, `app/business/onboarding/page.tsx`
- **Verification:** User re-tested live in the browser and confirmed the back button now correctly returns to the analyze pre-phase.
- **Committed in:** `31714be`

---

**Total deviations:** 1 auto-fixed (1 bug, Rule 1)
**Impact on plan:** Necessary correctness fix surfaced by the human-verify checkpoint exactly as the checkpoint mechanism is designed to do. No scope creep — fix was scoped to wiring the existing back-navigation intent, not a new feature.

## Issues Encountered
None beyond the deviation documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- FLOW-01 and FLOW-04 (app side) are complete: the onboarding flow renders StepPaikka before website analysis, and all five wizard steps plus the migrated `onboarding_draft.current_step` values (from 50-01) are consistent.
- EditMode (existing-venue editing) was not touched in this plan and remains on its prior step numbering.
- The following UAT-surfaced items remain open and are explicitly deferred to other phases, not part of this plan's scope:
  - Missing live preview during the AnalysoiSivusto analyze step (likely Phase 51 live-preview work)
  - AI color-picking bugs
  - Photos not displaying in DiagonaalKortti / detail sheet
  - Placeholder text styling
  - CalloutCard visualization issues

---
*Phase: 50-flow-uudelleenj-rjestys*
*Completed: 2026-06-17*

## Self-Check: PASSED

All 8 key files verified present on disk:
- FOUND: app/business/onboarding/page.tsx
- FOUND: app/business/WizardInner.tsx
- FOUND: app/business/onboarding/StepMediat.tsx
- FOUND: app/business/onboarding/StepHinnasto.tsx
- FOUND: app/business/onboarding/StepAukioloajat.tsx
- FOUND: app/business/onboarding/StepYhteystiedot.tsx
- FOUND: app/business/onboarding/AnalysoiSivusto.tsx
- FOUND: app/business/onboarding/ProgressBar.tsx

All 4 task commits verified present in git history:
- FOUND: c990d82 (Task 1)
- FOUND: 6e43972 (Task 2)
- FOUND: 1d269b8 (Task 3)
- FOUND: 31714be (Task 4 fix)

`npx tsc --noEmit` confirmed zero errors across the worktree.
