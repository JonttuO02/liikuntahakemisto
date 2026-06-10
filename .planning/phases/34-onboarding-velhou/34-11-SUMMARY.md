---
phase: 34-onboarding-velhou
plan: 11
status: complete
completed: "2026-06-10"
commits:
  - 1d613bc
  - 75dba4b
  - dc54e35
key-files:
  modified:
    - app/business/onboarding/OnboardingWizardInner.tsx
    - app/business/onboarding/StepEsikatselu.tsx
    - app/business/onboarding/StepYhteystiedot.tsx
    - app/business/onboarding/StepHinnasto.tsx
    - app/business/onboarding/StepAukioloajat.tsx
    - app/business/onboarding/UploadDropZone.tsx
    - app/business/onboarding/StepMediat.tsx
---

## Summary

Gap-closure plan fixing all 4 UAT failures in the onboarding wizard. Zero new dependencies; all fixes are surgical changes to existing components.

## What Was Built

**Gap 3 (blocker) — Step 6 infinite spinner:**
`OnboardingWizardInner.tsx` now applies `resolvedPaikkaId ?? existingDraft?.paikka_id ?? null` fallback before calling `setPaikkaId` and fetching paikkaInfo. Previously `setPaikkaId` was called before the draft was loaded, so the fallback never ran and `paikkaInfo` stayed permanently null. `StepEsikatselu.tsx` adds an 8-second timeout with a Finnish error message ("Esikatselu ei latautunut. Palaa takaisin ja yritä uudelleen.") so users are never stuck on an infinite spinner.

**Gap 2 — Character counter shows raw key:**
`StepYhteystiedot.tsx` line 145 changed from `.replace('{n}', ...)` to `t('contactDescCount', { n: descCount })` — the correct ICU interpolation syntax for next-intl v4. Counter now shows "47/300" instead of the translation key.

**Gap 4 — Back navigation loses data:**
Steps 3-5 now accept `initialHinnasto`, `initialDraftAukioloajat`, and `initialYhteystiedot` props respectively. `OnboardingWizardInner` passes the relevant draft slices to each step. `StepHinnasto` uses a lazy `useState` initializer seeded from `initialHinnasto`. `StepAukioloajat` prefers `initialDraftAukioloajat ?? existingAukioloajat` so user-entered hours win over Google Places data on back-navigation. `StepYhteystiedot` seeds all four field states from `initialYhteystiedot`.

**Gap 1 — Thumbnail UX:**
`UploadDropZone.tsx` restructured: the clickable drop target always shows the upload prompt; thumbnails render in a separate sibling strip below it with absolute X buttons. `onRemove?: (index: number) => void` prop added. `StepMediat.tsx` provides `removeLogoFile` (clears array) and `removePhotoFile` (filters by index) handlers passed to both zones.

## Deviations

None — all changes match the plan exactly.

## Self-Check: PASSED

- `npx tsc --noEmit` exits 0 (confirmed)
- Gap 2: `t('contactDescCount', { n: descCount })` — no `.replace()`
- Gap 3: `resolvedPaikkaId ?? existingDraft?.paikka_id` fallback present; 8s timeout in StepEsikatselu
- Gap 1: `onRemove` prop declared + wired in UploadDropZone; thumbnails outside clickable zone
- Gap 4: `initialHinnasto={draft?.hinnasto}` passed in OnboardingWizardInner
