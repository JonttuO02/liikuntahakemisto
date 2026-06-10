---
phase: 34-onboarding-velhou
plan: "09"
subsystem: business-onboarding
tags:
  - wizard
  - step-5
  - step-6
  - contact-form
  - preview
  - submit
dependency_graph:
  requires:
    - "34-06"
    - "34-05"
    - "34-01"
  provides:
    - StepYhteystiedot (step 5 contact form with 300-char description limit)
    - StepEsikatselu (step 6 preview + submit gate)
    - complete 6-step wizard (all steps wired in OnboardingWizardInner)
  affects:
    - app/business/onboarding/OnboardingWizardInner.tsx
tech_stack:
  added: []
  patterns:
    - framer-motion AnimatePresence for error fade
    - buildDraftAsPaikka for Liikuntapaikka preview construction
    - JWT Authorization header for fetch calls to Route Handlers
    - maxLength=300 + aria-describedby char counter for accessibility
key_files:
  created:
    - app/business/onboarding/StepYhteystiedot.tsx
    - app/business/onboarding/StepEsikatselu.tsx
  modified:
    - app/business/onboarding/OnboardingWizardInner.tsx
decisions:
  - "PaikkaSheet omitted from preview: position:fixed layout would overlay wizard screen"
  - "Step 2 (StepMediat) remains null-stubbed in wizard: wiring out of scope for Plan 09"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-10"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 1
---

# Phase 34 Plan 09: StepYhteystiedot and StepEsikatselu Summary

**One-liner:** Contact form step (step 5) with 300-char description counter + preview step (step 6) rendering PaikkaKortti, DiagonaalKortti, and simplified profile card using buildDraftAsPaikka, with submit redirect to /business.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create StepYhteystiedot.tsx (Step 5) | 23f164a | app/business/onboarding/StepYhteystiedot.tsx |
| 2 | Create StepEsikatselu.tsx + wire all steps | b2920ec | app/business/onboarding/StepEsikatselu.tsx, OnboardingWizardInner.tsx |

## What Was Built

### StepYhteystiedot (Step 5 — Contact Form)

Four optional input fields (phone, email, website, description) with:
- maxLength={300} on textarea; char counter {n}/300 that switches to text-red-600 at the limit
- aria-describedby="kuvaus-counter" for accessibility
- POSTs to /api/business/onboarding/save-step with field: 'yhteystiedot' and JWT Authorization
- AnimatePresence error handling

### StepEsikatselu (Step 6 — Preview + Submit)

Preview page rendering three sections:
1. LISTAKORTTI — PaikkaKortti component with draftAsPaikka prop
2. DIAGONAALIKORTTI — DiagonaalKortti component with draftAsPaikka prop
3. PROFIILISIVU — simplified inline .glass card showing nimi, hinta_kuvaus, kuvaus, puhelin

The draftAsPaikka object is constructed via buildDraftAsPaikka(draft, paikkaInfo) from lib/onboardingUtils.

Submit button POSTs to /api/business/onboarding/submit with JWT Authorization; on data.ok redirects to /business.

### OnboardingWizardInner (Updated)

- Added imports: StepYhteystiedot, StepEsikatselu
- Replaced {step >= 5 && null} stub with steps 5 and 6 components
- step === 5: StepYhteystiedot with paikkaId, onNext (saveAndAdvance(5)), onPrev (goToStep(4))
- step === 6: StepEsikatselu with draft, paikkaInfo, onPrev (goToStep(5))

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

**Step 2 (StepMediat) in OnboardingWizardInner:** The {step === 2 && null} stub from Plan 06 was not removed by Plan 07. StepMediat.tsx exists on disk, but the wizard still renders null for step 2. This is out of scope for Plan 09 (covers steps 5-6 only).

## Threat Surface Scan

No new network endpoints or auth paths introduced. Submit flow uses existing /api/business/onboarding/submit Route Handler (Plan 05). XSS mitigated: all user-supplied strings rendered as React text nodes, no dangerouslySetInnerHTML.

## Self-Check: PASSED

- StepYhteystiedot.tsx exists (commit 23f164a)
- StepEsikatselu.tsx exists (commit b2920ec)
- OnboardingWizardInner.tsx updated (commit b2920ec)
- npx tsc --noEmit: 0 errors
- npx vitest run lib/onboardingUtils.test.ts: 21/21 passed
- PaikkaSheet not imported in StepEsikatselu (grep count = 0)
- buildDraftAsPaikka used in StepEsikatselu (count = 2)
- router.push('/business') present (count = 1)
- maxLength={300} in StepYhteystiedot (count = 1)
- kuvaus-counter in StepYhteystiedot (count = 2: id + aria-describedby)
