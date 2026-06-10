---
phase: 36
plan: "06"
subsystem: business-panel
tags: [edit-mode, step-components, hallintapaneeli, hinnasto, aukioloajat, yhteystiedot]
dependency_graph:
  requires: [36-05]
  provides: [steps-3-5-edit-mode]
  affects: [app/business/[id]/EditWizardInner.tsx]
tech_stack:
  added: []
  patterns: [editMode-prop-pattern, save-inline-feedback, update-paikka-api]
key_files:
  created: []
  modified:
    - app/business/onboarding/StepHinnasto.tsx
    - app/business/onboarding/StepAukioloajat.tsx
    - app/business/onboarding/StepYhteystiedot.tsx
    - app/business/[id]/EditWizardInner.tsx
decisions:
  - editMode prop defaults false so onboarding flow is fully unchanged
  - StepHinnasto derives hinta_min/max/kuvaus from rows on save (not stored as structured array in DB)
  - hinta_kuvaus serialized as "Kategoria: €X (lisatieto); ..." capped at 200 chars
  - StepAukioloajat extracts buildOpenDaysObject helper to avoid duplication between handleNext and handleSave
  - StepYhteystiedot maps website field to varauslinkki for the update-paikka API
  - EditWizardInner passes paikka.aukioloajat with type cast to satisfy existingAukioloajat prop
metrics:
  duration: "3 minutes"
  completed: "2026-06-10"
  tasks_completed: 4
  files_modified: 4
---

# Phase 36 Plan 06: Edit-mode StepHinnasto + StepAukioloajat + StepYhteystiedot Summary

**One-liner:** editMode props wired into all three steps with Tallenna button, inline success/error feedback, and POST to /api/business/update-paikka with correct section mapping.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | StepHinnasto editMode | aa84e83 | app/business/onboarding/StepHinnasto.tsx |
| 2 | StepAukioloajat editMode | aa84e83 | app/business/onboarding/StepAukioloajat.tsx |
| 3 | StepYhteystiedot editMode | aa84e83 | app/business/onboarding/StepYhteystiedot.tsx |
| 4 | Wire steps 3-5 into EditWizardInner | b95cea2 | app/business/[id]/EditWizardInner.tsx |

## What Was Built

### StepHinnasto (Task 1)
Added `initialPaikkaHinnasto`, `editMode`, and `onSaveSuccess` optional props. In edit mode:
- Rows state prefers `initialPaikkaHinnasto` over `initialHinnasto` for initialization
- `handleSave` derives `hinta_min` (min of parsed floats), `hinta_max` (max of parsed floats), and `hinta_kuvaus` (compact "Kategoria: €X (note)" string capped at 200 chars) from current rows
- POSTs `{ paikka_id, section: 'hinnasto', data: { hinta_min, hinta_max, hinta_kuvaus } }` to `/api/business/update-paikka`
- `hasAnyPrice` gate keeps "Tallenna" disabled until at least one row has a value
- `saving`, `saveError`, `saveSuccessVisible` state pattern; success message auto-dismisses after 2s

### StepAukioloajat (Task 2)
Added `editMode` and `onSaveSuccess` optional props. In edit mode:
- Existing `useEffect` that reads `existingAukioloajat` already pre-fills state — no initialization change needed
- Extracted `buildOpenDaysObject` helper shared by both `handleNext` and `handleSave`
- `handleSave` POSTs `{ paikka_id, section: 'aukioloajat', data: openDaysObject }` to `/api/business/update-paikka`
- Same `saving`/`saveError`/`saveSuccessVisible` pattern

### StepYhteystiedot (Task 3)
Added `editMode` and `onSaveSuccess` optional props. In edit mode:
- `handleSave` maps the `website` state field to `varauslinkki` for the API (DB column name)
- POSTs `{ paikka_id, section: 'yhteystiedot', data: { puhelin, varauslinkki: website, kuvaus } }`
- Prev button also disabled during saving for consistency

### EditWizardInner (Task 4)
Replaced three TODO placeholder divs with actual step components:
- Step 3: `<StepHinnasto editMode={true} initialHinnasto={null} ...>`
- Step 4: `<StepAukioloajat editMode={true} existingAukioloajat={paikka.aukioloajat} ...>` — pre-fills from live paikka data
- Step 5: `<StepYhteystiedot editMode={true} initialYhteystiedot={{ puhelin, website: varauslinkki, kuvaus }} ...>` — pre-fills puhelin, varauslinkki, kuvaus

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. All save buttons call the real API endpoint. Pre-fill from paikka is live data passed from the server component.

## Threat Flags

None. No new network endpoints or auth paths introduced. All API calls go to the existing `/api/business/update-paikka` route handler with the same auth pattern (Bearer token + ownership check).

## Self-Check: PASSED

- `app/business/onboarding/StepHinnasto.tsx` — modified, confirmed present
- `app/business/onboarding/StepAukioloajat.tsx` — modified, confirmed present
- `app/business/onboarding/StepYhteystiedot.tsx` — modified, confirmed present
- `app/business/[id]/EditWizardInner.tsx` — modified, confirmed present
- Commits aa84e83 and b95cea2 confirmed in git log
- `npx tsc --noEmit` — passed (no output)
