---
phase: 61
fixed_at: "2026-06-26T00:00:00Z"
review_path: .planning/phases/61-onboarding-vaiheiden-uudelleenj-rjestys/61-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 61: Code Review Fix Report

**Fixed at:** 2026-06-26
**Source review:** .planning/phases/61-onboarding-vaiheiden-uudelleenj-rjestys/61-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7
- Fixed: 7
- Skipped: 0

## Fixed Issues

### Finding 1 (CRITICAL): Website URL clobbered by step-4 save

**Files modified:** `app/business/onboarding/StepYhteystiedot.tsx`
**Commit:** 4bda8fe
**Applied fix:** Added `website: website.trim()` to the step-4 save-step payload in `handleNext`. The `website` field is already held in component state (initialized from `initialYhteystiedot?.website`), so including it in the JSONB write prevents the step-4 save from replacing the entire `yhteystiedot` column and erasing the URL written by `handleNimiUrlNext` at step 1.

### Findings 2+3 (HIGH): Fast-forward misroutes + sijainti CTA stuck

**Files modified:** `app/business/onboarding/page.tsx`
**Commit:** 4e01c08
**Applied fix:** Two coordinated changes:

1. In `StepNimiJaURLPrePhase`, when `paikka.latitude !== null` (fast-forward path), now fetches the onboarding draft to re-hydrate `websiteUrl` (`draft.yhteystiedot?.website`), then calls `onNext(savedWebsite, true)` — where `true` is the new `alreadyHasLocation` flag. The `onNext` prop type was extended to `(websiteUrl: string | null, alreadyHasLocation?: boolean) => void`.

2. In `handleNimiUrlNext`, a new `alreadyHasLocation = false` parameter routes the user directly to `'analyze'` (if website) or `'laji-skip'` (if no website) instead of `'sijainti'` when the flag is true. This skips the sijainti step entirely for resuming users whose lat/lng is already saved, eliminating both the misrouted `handleSkip()` path (finding 2) and the disabled CTA trap (finding 3).

### Finding 4 (HIGH): Back from sijainti causes re-mount loop

**Files modified:** `app/business/onboarding/page.tsx`
**Commit:** a71c0cc
**Applied fix:** Added `skipFastForward` state (default `false`) to `OnboardingWizardPage`. When `StepSijainti`'s `onPrev` fires, sets `skipFastForward=true` before `setPagePhase('nimi-url')`. The `StepNimiJaURLPrePhase` component gained a `skipFastForward?: boolean` prop (default `false`) and guards the lat-based fast-forward with `if (paikka.latitude !== null && !skipFastForward)`. `handleNimiUrlNext` resets the flag to `false` whenever the user proceeds forward, so subsequent normal navigation is unaffected.

### Finding 5 (HIGH): onNext() unawaited — double-submit + silent errors

**Files modified:** `app/business/onboarding/StepYhteystiedot.tsx`
**Commit:** 2dc988d
**Applied fix:** Changed the `onNext` prop type from `() => void` to `() => void | Promise<void>` and changed `onNext()` to `await onNext()` inside `handleNext`'s try block. The `finally` block (`setLoading(false)`) now runs only after the full submit chain (save-step + `handleYhteystiedotSubmit`) completes, preventing the CTA from re-enabling mid-flight and eliminating the double-submit window.

### Finding 6 (MEDIUM): handleYhteystiedotSubmit silent on non-OK response

**Files modified:** `app/business/WizardInner.tsx`
**Commit:** 71d3672
**Applied fix:** Added `else { throw new Error(...) }` branch after the `if (res.ok)` guard in `handleYhteystiedotSubmit`. Because finding 5's `await onNext()` is now in place, this thrown error propagates to `StepYhteystiedot.handleNext`'s catch block, which calls `setError(t('errorGeneric'))` — giving the user visible feedback rather than a silent re-enabled button.

Note: this finding is classified as "requires human verification" in addition to "fixed" because the error surfacing relies on the interaction between the throw here and the catch in StepYhteystiedot — the reviewer should confirm the error message displays correctly end-to-end.

### Finding 7 (LOW): aiTriggered guard dead code

**Files modified:** `app/business/onboarding/page.tsx`
**Commit:** 583bfc6
**Applied fix:** Wrapped the `fetch('/api/business/analyze-website', ...)` call in `if (!aiTriggered)` and moved `setAiTriggered(true)` inside that block. The `save-step` (website URL persistence) call is kept outside the guard — it always runs, so a retry correctly re-persists the URL even when AI analysis is already deduped. A Back+Next cycle no longer fires a second `analyze-website` request.

## Skipped Issues

None.

---

_Fixed: 2026-06-26_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
