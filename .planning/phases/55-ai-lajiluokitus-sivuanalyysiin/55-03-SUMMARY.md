---
phase: 55-ai-lajiluokitus-sivuanalyysiin
plan: 03
subsystem: ui
tags: [react, nextjs, onboarding, ai-suggestion, lib/lajit]

# Dependency graph
requires:
  - phase: 55-01
    provides: BrandingResult.suggested_laji (validated against lib/lajit.ts allowlist), business_branding.suggested_laji column
  - phase: 55-02
    provides: save-step ALLOWED_FIELDS includes 'laji' with bounded validation; submit/route.ts writes draft.laji into liikuntapaikat via conditional spread
provides:
  - Distinct laji suggestion card (Suggested/Confirmed/Unconfirmed states) in AnalysoiSivusto's preview phase
  - Reusable LajiPicker sub-component (9-category grid + bounded free-text), exported for cross-component reuse
  - Reanalyze reset of all laji state (D-05)
  - Quick-accept laji write via fieldsToWrite (guarded against falsy values)
  - handleConfirm second save-step write for confirmed laji (full-wizard path)
  - D-06 skip-path manual picker (transient 'laji-skip' pagePhase) with no AI framing
affects: [56-claim-create-rework, future-onboarding-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared sub-component extraction (LajiPicker) reused by two divergent call sites (Vaihda flow, D-06 skip path) to avoid duplicated picker JSX/validation"
    - "Deferred-to-submit persistence — laji never writes via immediate PATCH; only through save-step -> submit, mirroring existing prices/hours/contact pattern"

key-files:
  created: []
  modified:
    - app/business/onboarding/AnalysoiSivusto.tsx
    - app/business/onboarding/page.tsx

key-decisions:
  - "LajiPicker exported from AnalysoiSivusto.tsx (not a new file) since it has no independent existence outside this onboarding flow yet — both call sites import it directly"
  - "D-06 skip-path picker implemented as a new transient pagePhase ('laji-skip') in page.tsx rather than inline inside AnalysoiSivusto's skip-triggering branches, since handleSkip already centralizes skip-flow control in page.tsx"
  - "handleQuickAccept's fieldsToWrite only includes the laji entry when confirmedLaji is truthy (conditional spread) — save-step's field validator 400s on empty/non-string laji, so an unconditional entry would break quick-accept whenever laji is still unconfirmed"

patterns-established:
  - "Suggestion-card three-state pattern (Suggested/Confirmed/Unconfirmed) for any future AI-extracted-and-confirmable onboarding field"

requirements-completed: [AI-06]

# Metrics
duration: 25min
completed: 2026-06-23
status: complete
---

# Phase 55 Plan 3: Laji Confirm/Change/Skip UX Summary

**Distinct laji suggestion card with Vahvista/Vaihda actions, a reusable 9-category LajiPicker shared by the Vaihda and D-06 skip-path flows, and save-step persistence wired into both the full-wizard and quick-accept paths.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2 of 3 completed (Task 3 is a human-verify checkpoint, paused per plan)
- **Files modified:** 2

## Accomplishments
- Suggestion card renders three distinct states (Suggested/Confirmed/Unconfirmed) between the Galleria and Hinnat blocks in AnalysoiSivusto's preview phase, using the exact UI-SPEC Finnish copy
- Extracted `LajiPicker` (9-category grid + bounded free-text input) as a single shared implementation — used by both the Vaihda flow (AnalysoiSivusto) and the D-06 skip-path flow (page.tsx), avoiding duplicated picker JSX
- `onReanalyze` reset clears all laji state (suggestion key, confirmed value, picker open) per D-05
- `handleQuickAccept`'s `fieldsToWrite` conditionally includes the confirmed laji (only when truthy, to respect save-step's field validator)
- `handleConfirm` in page.tsx performs a second sequential, awaited `save-step` write for `field: 'laji'`, guarded so it never sends a falsy value
- D-06: the skip path now routes through a new transient `'laji-skip'` `pagePhase` presenting the same `LajiPicker` (no AI/"Ehdotettu" framing) before the wizard, writing the pick through the same `save-step` `field: 'laji'` path

## Task Commits

Each task was committed atomically:

1. **Task 1: Suggestion card + extracted LajiPicker + state/reset/quick-accept in AnalysoiSivusto** - `15def61` (feat)
2. **Task 2: handleConfirm laji write + D-06 skip-path manual picker in page.tsx** - `6bf0118` (feat)
3. **Task 3: Human UAT checkpoint** - PAUSED, awaiting human verification (no commit — checkpoint task, no code change)

## Files Created/Modified
- `app/business/onboarding/AnalysoiSivusto.tsx` - Added `LajiPicker` sub-component (exported), laji local state (`confirmedLaji`/`suggestedLajiKey`/`lajiState`/`lajiPickerOpen`), suggestion card JSX (Suggested/Confirmed/Unconfirmed), seeding in the existing `selectionInitialisedRef`-guarded effect, `onConfirm`/`AnalysoiSivustoProps` type widened to carry `laji`, `fieldsToWrite` laji entry (conditional), `onReanalyze` reset additions
- `app/business/onboarding/page.tsx` - `PagePhase` widened with `'laji-skip'`, `handleConfirm`'s `selections` type widened + second sequential `save-step` write for `laji`, `PrePhase.onConfirm` type kept in sync, `handleSkip` now routes to `'laji-skip'` phase, new `handleLajiSkipPick`/`handleLajiSkipCancel` handlers, new render block for the `'laji-skip'` phase reusing the imported `LajiPicker`

## Decisions Made
- LajiPicker stays inside `AnalysoiSivusto.tsx` (exported) rather than a new shared file — both consumers are in the same onboarding subsystem and the component has no use outside it yet
- D-06 skip-path picker implemented as a dedicated `pagePhase` value rather than inline inside `AnalysoiSivusto`'s skip-triggering branches, keeping skip-flow control centralized in `page.tsx` where `handleSkip` already lives
- `fieldsToWrite`'s laji entry uses a conditional array spread (`...(confirmedLaji ? [...] : [])`) rather than always including the field — `save-step`'s field validator rejects empty/non-string `laji` with a 400, which would have broken quick-accept whenever the user hadn't confirmed a laji yet

## Deviations from Plan

None — plan executed as written. The codebase had evolved since RESEARCH.md/PATTERNS.md were authored (a Live Preview split-view layer was added around `editContent` in a prior phase, and `PreviewPhaseContent` now wraps the card content in props rather than the bare component RESEARCH.md described), but the suggestion-card insertion point (between Galleria and Hinnat), the picker shape, and all copy/state/persistence requirements were implemented exactly per the UI-SPEC and CONTEXT.md decisions (D-01 through D-06).

One implementation refinement beyond the PATTERNS.md sketch: `handleQuickAccept`'s `fieldsToWrite` laji entry needed to be conditional (not unconditionally included) because `save-step`'s validator (added in Plan 02) rejects falsy/empty `laji` values with a 400 — PATTERNS.md's sketch showed an unconditional `{ field: 'laji', value: confirmedLaji }` entry which would break quick-accept for any unconfirmed-laji flow. This is a direct consequence of Plan 02's validation already being stricter than the original sketch anticipated, not a new behavior choice.

## Issues Encountered

None — `npx tsc --noEmit` showed zero new errors originating in either modified file, and the full `npm test` suite (199 tests across 17 files) stayed green throughout.

## Issues Found During UAT (post-checkpoint fix)

Human UAT of Task 3 passed steps 1-8 except one: **the laji did not update on the wizard's preview cards during onboarding.**

**Root cause:** `page.tsx`'s `handleConfirm` correctly writes the confirmed `selections.laji` to `onboarding_draft.laji` via `save-step` (deferred-to-submit invariant D-04 — correct, untouched), but never stored it in page-level state, and `WizardInner` was never given any laji-related prop. Separately, `WizardInner`'s `OnboardingMode` fetches `paikkaInfo` (including `laji`) directly from `liikuntapaikat` on mount and feeds it straight into `LivePreviewProvider`/`StepEsikatselu`/the Step-1 read-only card. Since `liikuntapaikat.laji` is only updated at final submit (by design), the wizard's live preview showed the STALE pre-onboarding value for the entire session — never the value the user just confirmed in `AnalysoiSivusto`. This was a display gap introduced by this plan's confirm-then-defer flow, not a persistence bug — the DB write at final submit was already correct.

**Fix (display-only, no persistence change):**
- `app/business/onboarding/page.tsx`: added `confirmedLaji` state, set from `handleConfirm`'s `selections.laji` and from `handleLajiSkipPick`'s picked `value` (D-06 skip path); passed as a new `confirmedLaji` prop to `WizardInner`.
- `app/business/WizardInner.tsx`: widened the `mode: 'onboarding'` branch of `WizardInnerProps` with `confirmedLaji?: string | null`; in `OnboardingMode`, built a `livePreviewPaikkaInfo` derived value (`{ ...paikkaInfo, laji: confirmedLaji }` when `confirmedLaji` is set, else `paikkaInfo` unchanged) and used it for both the `LivePreviewProvider`'s `paikkaInfo` prop and `StepEsikatselu`'s `paikkaInfo` prop. `confirmedLaji` wins when the user picked one this session; falls back to the DB value on direct navigation/resume where nothing was confirmed yet.
- No changes to any save-step/submit write path — `liikuntapaikat.laji` is still only persisted at final submit via the existing conditional spread.

**Verification:** `npx tsc --noEmit` clean; full `npm test` suite (199 tests, 17 files) stayed green.

**Commits:** `c6f0f50` (fix), plus this SUMMARY update.

This fix has not yet been re-verified by the human — the checkpoint remains open pending re-confirmation that the live preview now updates correctly.

## Issues Found During UAT (second instance, post-c6f0f50 re-test)

Human re-test after the `c6f0f50` fix found the SAME class of bug on a DIFFERENT page: `AnalysoiSivusto.tsx`'s own preview phase (the suggestion-card / Vahvista/Vaihda page) has its own separate `LivePreviewProvider` instance, which was still passing the raw pre-analysis `paikkaInfo` prop straight through unmodified — so its live preview pane also never reflected the user's confirmed laji until final submit, independent of the `WizardInner.tsx` instance already fixed.

**Fix (display-only, no persistence change):**
- `app/business/onboarding/AnalysoiSivusto.tsx`: at the preview-phase `LivePreviewProvider` call site, derived a `livePreviewPaikkaInfo` value (`{ ...paikkaInfo, laji: confirmedLaji }` when both `paikkaInfo` and `confirmedLaji` are set, else `paikkaInfo` unchanged) and passed it as the `paikkaInfo` prop instead of the raw prop — mirroring the exact pattern from `WizardInner.tsx`'s `c6f0f50` fix. `confirmedLaji` was already local state in this component (used elsewhere for the suggestion-card UI), so no new state or prop threading was needed here.
- Null-safe: only overrides when `paikkaInfo` is non-null.
- No changes to `WizardInner.tsx` (already fixed) or any save-step/submit write path.

**Verification:** `npx tsc --noEmit` clean; full `npm test` suite (199 tests, 17 files) stayed green.

**Commits:** `9c0c0e4` (fix), plus this SUMMARY update.

This second fix has not yet been re-verified by the human — the checkpoint remains open pending re-confirmation that both live preview instances now update correctly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Tasks 1 and 2 are complete, committed, and verified (tsc clean, full test suite green). Task 3 is a `checkpoint:human-verify` (gate="blocking") covering criterion 2, D-02, D-03, D-05, D-06, and end-to-end persistence (criteria 3/4) — none of which have automated coverage per 55-RESEARCH.md's Validation Architecture section (no component-test infra in this project). A local dev server was started on port 3055 against this worktree (with `.env.local` copied in) and confirmed responsive (`/` returns 200, `/business/onboarding` returns 307 as expected for an unauthenticated request) to support manual verification. The orchestrator/human must complete the 8-step UAT walkthrough in `55-03-PLAN.md`'s Task 3 `<how-to-verify>` before this plan can be marked fully complete.

---
*Phase: 55-ai-lajiluokitus-sivuanalyysiin*
*Completed: 2026-06-23 (Tasks 1-2; Task 3 checkpoint pending)*
