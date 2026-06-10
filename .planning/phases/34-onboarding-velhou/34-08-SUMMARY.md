---
phase: 34-onboarding-velhou
plan: "08"
subsystem: onboarding-wizard-steps
tags: [wizard, pricing, opening-hours, i18n, framer-motion, glassmorphism, english-day-keys]
dependency_graph:
  requires:
    - lib/onboardingUtils.ts (ORDERED_DAYS, FI_TO_EN — Plan 01)
    - app/api/business/onboarding/save-step/route.ts (Plan 05)
    - app/business/onboarding/OnboardingWizardInner.tsx (Plan 06)
    - messages/fi.json Business namespace keys (Plan 03)
  provides:
    - app/business/onboarding/StepHinnasto.tsx (Step 3 pricing table with validation gate)
    - app/business/onboarding/StepAukioloajat.tsx (Step 4 hours editor with pre-fill)
  affects:
    - app/business/onboarding/OnboardingWizardInner.tsx (steps 3 and 4 now wired)
    - Plan 34-09 (steps 5-6 slot into same step-switcher pattern)
tech_stack:
  added: []
  patterns:
    - hasAnyPrice gate — Seuraava disabled until at least one PricingRow has a non-empty hinta
    - ORDERED_DAYS whitelist enforced in save payload (T-34-08-02 day key injection mitigation)
    - EN_TO_FI local constant for display-only Finnish abbreviations
    - useEffect pre-fill from existingAukioloajat (Google Places data)
    - role="switch" aria-checked toggle pattern for Auki/Suljettu day state
    - AnimatePresence error fade (opacity, duration 0.15) consistent with other steps
    - framer-motion whileTap={{ scale: 0.95 }} on primary CTA buttons
key_files:
  created:
    - app/business/onboarding/StepHinnasto.tsx
    - app/business/onboarding/StepAukioloajat.tsx
  modified:
    - app/business/onboarding/OnboardingWizardInner.tsx
decisions:
  - StepHinnasto initializes with 4 fixed rows using t() keys at mount time; kategoria is a translated string stored in row state (not a key) for direct send to save-step
  - EN_TO_FI map is a local constant (not exported from onboardingUtils) because it is display-only; only ORDERED_DAYS (storage keys) need to be shared
  - OnboardingWizardInner renders steps 3 and 4 conditionally on paikkaId !== null to prevent null paikkaId from reaching child props typed as number
  - Worktree was 185 commits behind master; merged master before implementing tasks
metrics:
  duration: "~12 minutes"
  completed: "2026-06-10"
  tasks_completed: 2
  files_created: 2
  files_modified: 1
---

# Phase 34 Plan 08: StepHinnasto and StepAukioloajat — Summary

Step 3 pricing table with 4 fixed category rows + dynamic custom rows and the hasAnyPrice validation gate; Step 4 opening hours editor with 7-day Auki toggles, Google Places pre-fill, and English day key enforcement via ORDERED_DAYS whitelist. Both wired into OnboardingWizardInner.

## What Was Built

### app/business/onboarding/StepHinnasto.tsx

Client component for Step 3 (Hinnasto). Renders a `<table>` with 4 fixed pricing rows (Kertakäynti, Kuukausijäsenyys, 10-kerran kortti, Vuosijäsenyys) and user-addable dynamic rows. Key implementation details:

- `PricingRow` type with `isFixed` flag controls which rows show an editable `kategoria` input vs. a static label.
- `hasAnyPrice` derived state (`rows.some(r => r.hinta.trim() !== '')`) gates the Seuraava button — ONBOARD-04 requirement.
- "+ Lisää hintarivi" button appends a new custom row with `id: custom-${Date.now()}`.
- Dynamic rows have an X delete button (lucide-react) with `hover:text-red-600` destructive style.
- `handleNext` filters rows to non-empty hinta before POST, sends `{ field: 'hinnasto', value: [...] }` to `/api/business/onboarding/save-step` with JWT.
- AnimatePresence error message with `role="alert" aria-live="polite"`.

### app/business/onboarding/StepAukioloajat.tsx

Client component for Step 4 (Aukioloajat). Renders 7 day rows using ORDERED_DAYS iteration. Key implementation details:

- `EN_TO_FI` local constant maps storage keys to Finnish display abbreviations (Ma/Ti/Ke/To/Pe/La/Su).
- `useEffect` on `existingAukioloajat` prop: if data present, sets `isOpen: true` and fills time values for matching days; sets `wasPreFilled(true)` to show the Google Places caps label.
- Auki toggle: `role="switch"` button with `aria-checked`, `bg-[#111111]` ON / `bg-[rgba(17,17,17,0.12)]` OFF.
- Open days show two `type="time"` inputs with screen-reader-only `<label>` elements (Aloitusaika / Lopetusaika).
- Closed days show `t('hoursClosed')` muted text.
- `handleNext` builds save value by iterating ORDERED_DAYS and including only `isOpen` days — T-34-08-02 whitelist enforcement.

### app/business/onboarding/OnboardingWizardInner.tsx

Updated to import StepHinnasto and StepAukioloajat. Step-switcher now:
- `step === 2`: null stub (StepMediat — Plan 07)
- `step === 3`: renders `<StepHinnasto paikkaId={paikkaId} onNext={() => saveAndAdvance(3)} onPrev={() => goToStep(2)} />`
- `step === 4`: renders `<StepAukioloajat paikkaId={paikkaId} existingAukioloajat={paikkaInfo?.aukioloajat} onNext={() => saveAndAdvance(4)} onPrev={() => goToStep(3)} />`
- `step >= 5`: null stub (Plan 09)

Both step components receive `paikkaId` guarded by `paikkaId !== null` condition to satisfy TypeScript `number` prop type.

## Threat Mitigations Applied

| Threat ID | Mitigation | Location |
|-----------|-----------|----------|
| T-34-08-02 | ORDERED_DAYS whitelist: only English day keys from the 7-element array are included in save payload; arbitrary keys cannot be injected | StepAukioloajat.tsx handleNext |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 096bcf1 | feat | create StepHinnasto pricing table (Step 3) |
| 209e986 | feat | create StepAukioloajat (Step 4) and wire steps 3-4 into wizard |

## Deviations from Plan

### Deviation 1 — Worktree merge required (Rule 3: blocking issue)

**Found during:** Pre-execution setup
**Issue:** Worktree was 185 commits behind master. `lib/onboardingUtils.ts`, `app/business/onboarding/OnboardingWizardInner.tsx`, and other Plan 01-07 outputs were absent from the worktree.
**Fix:** `git merge master --no-edit` in the worktree — brought in all missing commits.
**Files modified:** None (merge only).
**Pattern:** Same as Plan 06 deviation.

## Known Stubs

Steps 5-6 in OnboardingWizardInner.tsx render `null` for `step >= 5`. This is intentional — Plan 34-09 implements StepYhteystiedot and StepEsikatselu.

## Threat Flags

None. No new network endpoints. Both steps send to the existing `/api/business/onboarding/save-step` Route Handler (Plan 05).

## Self-Check: PASSED

- app/business/onboarding/StepHinnasto.tsx: FOUND
- app/business/onboarding/StepAukioloajat.tsx: FOUND
- app/business/onboarding/OnboardingWizardInner.tsx: FOUND (modified)
- Commit 096bcf1 (Task 1): FOUND
- Commit 209e986 (Task 2): FOUND
- TypeScript: npx tsc --noEmit — 0 errors
