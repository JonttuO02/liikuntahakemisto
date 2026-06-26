---
phase: 61-onboarding-vaiheiden-uudelleenj-rjestys
plan: "04"
subsystem: onboarding
tags: [state-machine, page-rewrite, deletion, background-ai, fire-and-forget]
dependency_graph:
  requires: ["61-02", "61-03"]
  provides: ["onboarding-page-state-machine-v2"]
  affects: ["app/business/onboarding/page.tsx"]
tech_stack:
  added: []
  patterns:
    - fire-and-forget dual-fetch (analyze-website + save-step yhteystiedot)
    - Pitfall 10 fast-forward (latitude !== null auto-advance)
    - Pitfall 8 handleBackToPrePhase (websiteUrl-conditional routing)
key_files:
  created: []
  modified:
    - app/business/onboarding/page.tsx
  deleted:
    - app/business/onboarding/StepPaikka.tsx
decisions:
  - "PagePhase union now 'nimi-url' | 'sijainti' | 'analyze' | 'laji-skip' | 'wizard'; initial phase 'nimi-url'"
  - "Fast-forward: paikka.latitude !== null auto-advances from nimi-url to sijainti (Pitfall 10)"
  - "handleBackToPrePhase targets 'analyze' when websiteUrl truthy, else 'laji-skip' (Pitfall 8)"
  - "Two fire-and-forget POSTs on nimi-url Next: analyze-website (AI) + save-step (website persistence)"
metrics:
  duration: "15min"
  completed: "2026-06-26"
  tasks_completed: 2
  files_modified: 1
  files_deleted: 1
status: complete
---

# Phase 61 Plan 04: Onboarding Page State Machine Rewrite Summary

Rewired `app/business/onboarding/page.tsx` to the new nimi-url → sijainti → analyze/laji-skip → wizard order with background AI trigger and website URL persistence; deleted `StepPaikka.tsx` with no dangling references.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Rewrite the onboarding page state machine | 749cdca | app/business/onboarding/page.tsx |
| 2 | Delete the obsolete StepPaikka component | ec8225e | app/business/onboarding/StepPaikka.tsx (deleted) |

## What Was Built

### Task 1: page.tsx state machine rewrite

**`PagePhase` type change:**
- Before: `'paikka' | 'analyze' | 'laji-skip' | 'wizard'`, initial `'paikka'`
- After: `'nimi-url' | 'sijainti' | 'analyze' | 'laji-skip' | 'wizard'`, initial `'nimi-url'`

**`StepNimiJaURLPrePhase` (replaces `StepPaikkaPrePhase`):**
- Identical paikka_id resolution logic (URL param → business_paikka_links fallback)
- `onNext: (websiteUrl: string | null) => void` instead of `() => void`
- Fast-forward (Pitfall 10): if `paikka.latitude !== null` after resolution, auto-calls `onNext(null)` to advance to sijainti
- Renders `<StepNimiJaURL>` instead of `<StepPaikka>`

**New state added to `OnboardingWizardPage`:**
- `websiteUrl: string | null` (init null)
- `aiTriggered: boolean` (init false)

**`handleNimiUrlNext(url: string | null)`:**
- Sets `websiteUrl` and advances to `'sijainti'`
- When `url` is non-null and `paikkaId !== null`: fires two non-awaited POSTs:
  - `POST /api/business/analyze-website` with `{ url, paikka_id }` (background AI)
  - `POST /api/business/onboarding/save-step` with `{ field: 'yhteystiedot', value: { website: url } }` (Pitfall 2 persistence)
- Sets `aiTriggered = true`

**`'sijainti'` render block:**
- `<StepSijainti paikkaId={paikkaId} onNext={() => websiteUrl ? setPagePhase('analyze') : handleSkip()} onPrev={() => setPagePhase('nimi-url')} />`
- Only rendered when `paikkaId !== null`

**`handleBackToPrePhase` (replaces `handleBackToAnalyze`):**
- Routes to `'analyze'` when `websiteUrl` is truthy, else `'laji-skip'` (Pitfall 8)
- Passed to `WizardInner` via `onBackToAnalyze={handleBackToPrePhase}` (prop name unchanged)

### Task 2: StepPaikka deletion

- `git rm app/business/onboarding/StepPaikka.tsx`
- Grep confirmed no source imports remain — only historic comments in WizardInner.tsx and AnalysoiSivusto.tsx
- `npx tsc --noEmit` passed after deletion

## Deviations from Plan

None — plan executed exactly as written.

## Acceptance Criteria Verification

- [x] `PagePhase` includes `'nimi-url'` and `'sijainti'`; no longer includes `'paikka'`; initial phase `'nimi-url'`
- [x] `handleNimiUrlNext` fires POST to `/api/business/analyze-website` (exact path) and POST to `/api/business/onboarding/save-step` with `field: 'yhteystiedot'` and `value.website`, only when URL is non-null
- [x] Sijainti `onNext` routes to `'analyze'` when `websiteUrl` truthy, else `handleSkip()` → `'laji-skip'`
- [x] `handleBackToPrePhase` targets `'analyze'` vs `'laji-skip'` based on `websiteUrl`; wired into WizardInner
- [x] Resolution useEffect fast-forwards (`onNext(null)`) when `paikka.latitude !== null`
- [x] `StepPaikka` is no longer imported anywhere
- [x] `npx tsc --noEmit` passes (both after Task 1 and after Task 2)
- [x] `test ! -f app/business/onboarding/StepPaikka.tsx` succeeds

## Self-Check: PASSED

- `/app/business/onboarding/page.tsx` exists and has new PagePhase union
- `app/business/onboarding/StepPaikka.tsx` confirmed deleted
- Commit 749cdca exists (Task 1)
- Commit ec8225e exists (Task 2)
- No source file imports StepPaikka (tsc passes cleanly)
