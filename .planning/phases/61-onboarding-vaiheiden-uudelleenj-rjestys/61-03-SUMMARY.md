---
phase: 61-onboarding-vaiheiden-uudelleenj-rjestys
plan: "03"
subsystem: onboarding-wizard
tags: [wizard, onboarding, submit, step-collapse]
status: complete

requires:
  - 61-01

provides:
  - 4-step onboarding wizard with inline submit from StepYhteystiedot
  - StepEsikatselu deleted

affects:
  - app/business/WizardInner.tsx
  - app/business/onboarding/StepYhteystiedot.tsx
  - app/business/onboarding/ProgressBar.tsx

tech-stack:
  added: []
  patterns:
    - inline-submit-from-step (submit logic moved from separate preview step into the last data step)
    - editMode-gate (UI elements conditionally rendered based on onboarding vs edit context)

key-files:
  created: []
  modified:
    - app/business/WizardInner.tsx
    - app/business/onboarding/StepYhteystiedot.tsx
    - app/business/onboarding/ProgressBar.tsx
  deleted:
    - app/business/onboarding/StepEsikatselu.tsx

decisions:
  - "handleYhteystiedotSubmit in WizardInner reuses StepEsikatselu's proven submit logic (getSession → POST submit → router.push('/business'))"
  - "website state kept in StepYhteystiedot for editMode compatibility; initialized to '' in onboarding since no branding fallback prop is passed"
  - "brandingWebsite variable removed from WizardInner since its only consumer (initialBrandingWebsite prop) was removed"

metrics:
  duration_minutes: 15
  completed: "2026-06-26"
  tasks_completed: 3
  files_changed: 4
---

# Phase 61 Plan 03: Wizard tail collapse and inline submit — Summary

**One-liner:** Onboarding wizard supistettiin 5 askeleesta 4:ään siirtämällä submit-logiikka StepEsikatselu:sta StepYhteystiedot:iin ja poistamalla erillinen esikatselu-askel.

---

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Gate website field and add inline submit to StepYhteystiedot | 439d605 | app/business/onboarding/StepYhteystiedot.tsx |
| 2 | Collapse WizardInner to 4 steps and submit inline; delete StepEsikatselu | d5f2d90 | app/business/WizardInner.tsx, app/business/onboarding/StepEsikatselu.tsx (DELETED) |
| 3 | Relabel ProgressBar final milestone to SUBMIT | d180c79 | app/business/onboarding/ProgressBar.tsx |

---

## What Was Built

### StepYhteystiedot (Task 1)

- `initialBrandingWebsite` prop removed from interface and destructuring
- Website `<input type="url">` wrapped in `{editMode && (...)}` — hidden during onboarding, visible in edit mode
- `website` state initialized to `initialYhteystiedot?.website ?? ''` (no branding fallback)
- `website` field removed from `handleNext`'s save-step POST body (onboarding path sends only puhelin, email, kuvaus)
- Footer CTA in onboarding path changed from `t('nextCta')` to `t('submitCta')` with inline loading spinner
- Edit mode behavior unchanged: website visible, CTA shows `t('saveCta')`, saves via update-paikka

### WizardInner (Task 2)

- `import StepEsikatselu` removed
- `rawStep > 5 → rawStep > 4` in step URL validation
- `Math.min(Math.max(n, 1), 5) → ..., 4)` in `goToStep`
- `Math.min(draft.current_step, 5) → ..., 4)` in `completedSteps`
- `Math.min(savedStep, 5) → ..., 4)` in `loadDraft` resume clamp
- step-5 re-fetch `useEffect` deleted entirely
- `handleYhteystiedotSubmit` added: gets session, POSTs to `/api/business/onboarding/submit`, calls `router.push('/business')` on `data.ok`
- StepYhteystiedot render: `onNext={handleYhteystiedotSubmit}`, `initialBrandingWebsite` prop removed
- `step === 5` render branch (StepEsikatselu) removed
- `brandingWebsite` variable removed (no longer consumed)

### ProgressBar (Task 3)

- `t('stepPreview')` → `t('stepSubmit')` in `stepLabels[4]`
- `stepSubmit` key ("Lähetys" / "Submit") was added by Plan 01 (wave 1)

### StepEsikatselu (deleted)

- File `app/business/onboarding/StepEsikatselu.tsx` deleted
- No dangling imports: `tsc --noEmit` passes with the file gone

---

## Verification

- `npx tsc --noEmit` passes after all three tasks
- `test ! -f app/business/onboarding/StepEsikatselu.tsx` — PASS
- No occurrence of `StepEsikatselu` import in codebase
- No occurrence of `t('stepPreview')` in ProgressBar.tsx
- All four numeric clamps changed from 5 → 4

---

## Deviations from Plan

None — plan executed exactly as written.

---

## Known Stubs

None — no stub patterns introduced. Submit logic is real (reuses existing route).

---

## Threat Flags

No new security surface introduced. Plan reuses the existing `/api/business/onboarding/submit` route unchanged (T-61-07: JWT + ownership verified server-side). Step-range clamp regression prevented by consistent 4-step ceiling across all four clamp sites (T-61-08).

---

## Self-Check

Checking created files and commits exist...

- `app/business/onboarding/StepEsikatselu.tsx` deleted: PASS
- Commit 439d605 (Task 1): PASS
- Commit d5f2d90 (Task 2): PASS
- Commit d180c79 (Task 3): PASS

## Self-Check: PASSED
