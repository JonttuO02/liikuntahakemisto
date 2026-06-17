---
phase: 50-flow-uudelleenj-rjestys
reviewed: 2026-06-17T10:55:39Z
depth: standard
files_reviewed: 10
files_reviewed_list:
  - supabase/migrations/20260617000000_renumber_onboarding_steps.sql
  - app/api/business/onboarding/save-step/route.ts
  - app/business/onboarding/page.tsx
  - app/business/WizardInner.tsx
  - app/business/onboarding/StepMediat.tsx
  - app/business/onboarding/StepHinnasto.tsx
  - app/business/onboarding/StepAukioloajat.tsx
  - app/business/onboarding/StepYhteystiedot.tsx
  - app/business/onboarding/AnalysoiSivusto.tsx
  - app/business/onboarding/ProgressBar.tsx
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
---

# Phase 50: Code Review Report

**Reviewed:** 2026-06-17T10:55:39Z
**Depth:** standard
**Files Reviewed:** 10
**Status:** issues_found

## Summary

Phase 50 reorders the business-onboarding wizard (StepPaikka moved out to a page-level
pre-phase ahead of AnalysoiSivusto; wizard renumbered 6→5 steps) and ships a one-time SQL
migration plus a widened save-step bounds check to keep `onboarding_draft.current_step`
consistent across the renumber. The renumbering itself (Tasks 1-3 of 50-02, and both tasks
of 50-01) is mechanically correct: every `step: N` literal, the `rawStep > 5` bound, the
`step !== 5` preview re-fetch guard, and `ProgressBar`'s 5-entry label array all line up with
the plan. The late back-navigation fix (`onBackToAnalyze` threaded from `page.tsx` through
`WizardInner` into `StepMediat.onPrev`) is wired correctly and the types correctly scope it to
onboarding mode only, leaving `EditMode` untouched.

However, the route's own reconciliation (D-07 + D-04) deliberately leaves a path where
`current_step` can be persisted as `6` — one value above the wizard's own 1-5 render range —
and `WizardInner`'s resume/completed-step logic was not updated to guard against that value.
This produces a real, reachable bug (CR-01) when a quick-accept submission fails partway and
the user later reopens the onboarding page. Additionally, the new `StepPaikkaPrePhase`
duplicates `PrePhase`'s paikka_id resolution instead of reusing the already-resolved value,
causing a redundant fetch/spinner flicker on every `paikka → analyze` transition.

## Critical Issues

### CR-01: Stale `current_step = 6` from quick-accept causes a spurious step-6 redirect and wrongly marks StepEsikatselu as "completed"

**File:** `app/business/WizardInner.tsx:64-66,124-132`
**Issue:**
`AnalysoiSivusto.handleQuickAccept` (`app/business/onboarding/AnalysoiSivusto.tsx:305`) writes
`step: 5` for all four draft fields, which `save-step/route.ts:110` persists as
`current_step: 6` (`step + 1`). This is the documented, accepted reconciliation from
50-01-PLAN.md ("the stored value stays in 1-6 only for the short-lived quick-accept case ...
which `submit` deletes on success"). The risk surface is the *failure* path: if any of the
4 sequential writes or the final `submit` call fails (network error, 500, etc. — all handled
as non-fatal `setQuickError` returns in `AnalysoiSivusto.tsx:308-326`), the `onboarding_draft`
row survives with `current_step = 6` and the user is left on the AnalysoiSivusto screen with
an error message and a "Jatka velhoon →" escape hatch.

If the user closes the tab instead of clicking through, and later reopens
`/business/onboarding`, `WizardInner`'s `OnboardingMode` loads this stale draft:
- `completedSteps` (line 64-66) computes `Array.from({ length: draft.current_step - 1 }, ...)`
  = `[1,2,3,4,5]` — this marks **StepEsikatselu (step 5) as "completed"** in the progress bar
  (checkmark), even though the preview step has no `saveAndAdvance` call and was never visited.
- The resume-bounce guard (line 128) `if (savedStep > 1 && step === 1)` is true for
  `savedStep = 6`, so it `router.push`es to `?step=6` (line 129-131) — a step number that is
  outside the wizard's own valid 1-5 range. The render-time clamp (line 55,
  `rawStep > 5 ? 1 : rawStep`) silently drops back to step 1 on the next render, but the user
  still observes a URL flash to `?step=6` and an extra redirect round-trip, and the progress
  bar will show all 5 circles checked off while the user is actually back on step 1.

This is a directly reachable regression introduced by this phase's bounds-check
reconciliation: prior to Phase 50, the equivalent transient value was `7` (old `step: 6` →
`current_step: 7`) against an old 1-6 wizard range, so the same class of off-by-one existed,
but the renumbering did not add a guard against it despite explicitly re-deriving the
resume/completed logic's literals.

**Fix:** Clamp the transient `current_step = 6` case before using it for navigation/completion
math, e.g.:
```ts
// WizardInner.tsx — clamp draft.current_step to the wizard's own valid range before
// deriving completedSteps or building the resume-bounce URL.
const clampedCurrentStep = draft?.current_step
  ? Math.min(draft.current_step, 5)
  : undefined

const completedSteps: number[] = clampedCurrentStep && clampedCurrentStep > 1
  ? Array.from({ length: clampedCurrentStep - 1 }, (_, i) => i + 1)
  : []

// ...
const savedStep = Math.min(existingDraft?.current_step ?? 0, 5)
```
Alternatively, fix it at the source: `AnalysoiSivusto.tsx:305` could send `step: 4` (so
`current_step` lands on `5`, the last valid wizard step) instead of `step: 5`, since the
quick-accept draft was never actually advanced past StepYhteystiedot in the numbered wizard.

## Warnings

### WR-01: `StepPaikkaPrePhase` re-resolves `paikka_id`/info that `PrePhase` re-resolves again moments later

**File:** `app/business/onboarding/page.tsx:25-153`
**Issue:** `StepPaikkaPrePhase` (lines 25-90) resolves `paikka_id` via URL param →
`business_paikka_links` lookup and surfaces it to the parent via `onPaikkaIdResolved`. When the
user clicks "Seuraava" and `pagePhase` becomes `'analyze'`, `PrePhase` (lines 96-153) mounts and
performs the **exact same resolution from scratch** — it does not accept the already-resolved
`paikkaId` from `OnboardingWizardPage`'s state as a prop, even though that value is sitting one
level up. The result is a second `business_paikka_links` round trip and a second
`PreVaiheSpinner` flash every time a user advances from the paikka phase to the analyze phase —
a regression in perceived performance/smoothness directly caused by inserting the new pre-phase
ahead of the existing one without threading the resolved id forward.
**Fix:** Pass the page-level `paikkaId` into `PrePhase` as a prop and skip re-resolution when
it is already known:
```tsx
function PrePhase({ paikkaId: knownPaikkaId, onConfirm, onSkip, onPaikkaIdResolved }: {
  paikkaId: number | null
  /* ...existing props... */
}) {
  const searchParams = useSearchParams()
  const [paikkaId, setPaikkaId] = useState<number | null>(knownPaikkaId)
  useEffect(() => {
    if (knownPaikkaId !== null) return // already resolved by StepPaikkaPrePhase
    // ...existing resolution logic...
  }, [])
  // ...
}
```
And pass `paikkaId={paikkaId}` at the `pagePhase === 'analyze'` call site.

### WR-02: `current_step` can be persisted one value above the route's own documented "1-5" stored range

**File:** `app/api/business/onboarding/save-step/route.ts:59-67,110`
**Issue:** The inline comment at lines 59-62 states the accepted input range "maps this input
range to the stored 1-5 range the 5-step wizard requires (D-07)" — but `current_step = step + 1`
with the accepted upper bound `step = 5` produces a stored value of `6`, one above the
documented range. This is intentional per the plan's reconciliation note (only the AnalysoiSivusto
quick-accept caller sends `step: 5`), but the route's own validation and comment text overstate
the guarantee — a reader of just this file (without the cross-decision reconciliation context)
would reasonably conclude no caller can ever persist `current_step > 5`. The lack of any
guard against this known exception is what enables CR-01.
**Fix:** Either tighten the comment to explicitly flag the exception ("stored range is 1-5 for
wizard callers, 1-6 for the short-lived AnalysoiSivusto quick-accept case — callers downstream
of this route must clamp before using current_step for step-range math"), or remove the
exception entirely by having `AnalysoiSivusto.tsx` send `step: 4` instead of `step: 5` (see CR-01
fix).

### WR-03: `goToStep` and the resume-bounce URL builder do not clamp the target step number

**File:** `app/business/WizardInner.tsx:57-61,128-132`
**Issue:** Both `goToStep(n)` (used by `saveAndAdvance`, `ProgressBar`'s `onStepClick`, and every
step's `onPrev`) and the inline resume-bounce `router.push` block construct a `step` URL param
directly from a caller-supplied or DB-sourced number with no `Math.min(n, 5)` / `Math.max(n, 1)`
guard. The render-time `step` variable (line 55) clamps correctly, so this is not exploitable for
a crash, but it allows the URL bar to display an invalid step (e.g. `?step=6`, see CR-01) for one
render cycle, and means any future caller of `goToStep` with an out-of-range value will silently
produce a confusing URL rather than a clear error.
**Fix:**
```ts
function goToStep(n: number) {
  const clamped = Math.min(Math.max(n, 1), 5)
  const params = new URLSearchParams({ step: String(clamped) })
  if (paikkaId !== null) params.set('paikka_id', String(paikkaId))
  router.push('/business/onboarding?' + params.toString())
}
```

## Info

### IN-01: `StepPaikka`'s "Next" button has no error/empty state when `paikkaId` never resolves

**File:** `app/business/onboarding/StepPaikka.tsx:55`, `app/business/onboarding/page.tsx:217-224`
**Issue:** `StepPaikkaPrePhase` can finish resolution with `paikkaId === null` (no URL param, no
`business_paikka_links` row for the authenticated user — e.g. a business account with no claimed
venue yet navigating here directly). `StepPaikka` permanently disables its only actionable button
(`disabled={paikkaId === null}`) with no error message, leaving the user stuck on a screen with
no indication of what went wrong or what to do next. This logic predates Phase 50 (it lived
inside the wizard before), but Phase 50 makes it the very first screen a new business owner sees,
raising the likelihood a user without a properly-linked venue hits this dead end before reaching
any other part of onboarding.
**Fix:** Surface a fallback message/CTA (e.g. "link to /business/map to claim a venue first")
when `paikkaId` resolves to `null` instead of silently disabling the button.

### IN-02: Migration file's UPDATE has no row-count logging or guard against double-application outside the migration ledger

**File:** `supabase/migrations/20260617000000_renumber_onboarding_steps.sql:15`
**Issue:** The single `UPDATE onboarding_draft SET current_step = current_step - 1 WHERE
current_step >= 2;` statement is safe under Supabase's migration-ledger guarantee (each file
applies exactly once), as the plan's threat model (T-50-02) explicitly accepts. However, the
migration carries no defensive `WHERE` upper bound (e.g. excluding rows already known to be
post-migration) and no comment noting what manual remediation looks like if an operator ever
needs to re-run it by hand (e.g. via the Supabase SQL editor, bypassing the ledger) — a manual
re-run would silently double-decrement every in-flight draft with no error or warning.
**Fix:** Add a one-line comment noting the statement is NOT idempotent and must never be
re-run manually outside the migration tooling, to reduce operator error risk during future
incident response.

---

_Reviewed: 2026-06-17T10:55:39Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
