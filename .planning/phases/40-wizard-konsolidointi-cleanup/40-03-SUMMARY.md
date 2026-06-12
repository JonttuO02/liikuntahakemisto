---
phase: 40-wizard-konsolidointi-cleanup
plan: "03"
subsystem: business-wizard
tags: [business, wizard, onboarding, edit, consolidation, cleanup]

requires:
  - phase: 40-wizard-konsolidointi-cleanup
    plan: "01"
    provides: CLEAN-03/04/05 pre-conditions verified

provides:
  - "CLEAN-02: OnboardingWizardInner + EditWizardInner merged into single WizardInner.tsx"
  - "WizardInner(mode: 'onboarding' | 'edit') — single-file maintenance achieved"
  - "Both parent pages updated; old files deleted; TypeScript clean"

affects:
  - app/business/WizardInner.tsx (new)
  - app/business/onboarding/page.tsx (updated)
  - app/business/[id]/page.tsx (updated)
  - app/business/onboarding/OnboardingWizardInner.tsx (deleted)
  - app/business/[id]/EditWizardInner.tsx (deleted)

tech-stack:
  added: []
  patterns:
    - "Discriminated union props (mode: 'onboarding' | 'edit') for single-file multi-mode component"
    - "Private sub-components (OnboardingMode, EditMode) inside WizardInner.tsx to satisfy React hooks rules"

key-files:
  created:
    - app/business/WizardInner.tsx
  modified:
    - app/business/onboarding/page.tsx
    - app/business/[id]/page.tsx
  deleted:
    - app/business/onboarding/OnboardingWizardInner.tsx
    - app/business/[id]/EditWizardInner.tsx

key-decisions:
  - "OnboardingMode and EditMode are private sub-components within WizardInner.tsx — satisfies React hooks rules without conditional hook calls"
  - "Logic copied verbatim from both source files — no refactoring, no simplification"
  - "Step imports adjusted to ./onboarding/ prefix (file lives at app/business/ root level)"
  - "Stale comment referencing EditWizardInner removed from [id]/page.tsx (Phase 39 middleware now handles auth)"

requirements-completed:
  - CLEAN-02

duration: 15min
completed: "2026-06-12"
---

# Phase 40 Plan 03: Wizard-konsolidointi CLEAN-02 Summary

**OnboardingWizardInner ja EditWizardInner yhdistetty yhdeksi WizardInner.tsx-tiedostoksi mode: 'onboarding' | 'edit' -propsilla — single-file maintenance saavutettu, TypeScript puhdas**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-12T09:00Z
- **Completed:** 2026-06-12T09:15Z
- **Tasks:** 5
- **Files modified:** 3 (updated) + 1 (created) + 2 (deleted) = 6 total

## Accomplishments

- **Task 1:** Molemmat lähdetiedostot luettu kokonaan — OnboardingWizardInner (265 riviä) ja EditWizardInner (159 riviä).
- **Task 2:** `app/business/WizardInner.tsx` luotu (421 riviä). Sisältää:
  - `OnboardingMode()` — verbatim kopio OnboardingWizardInner-funktion rungosta (6 askelta, ProgressBar, maxReachedStep-guard, draft loading, saveAndAdvance)
  - `EditMode({ paikka, paikkaId })` — verbatim kopio EditWizardInner-funktion rungosta (tab bar, 5 tabbia, vapaa navigointi, PreviewModal, local state)
  - `WizardInner(props: WizardInnerProps)` — exported shell joka reitittää oikeaan sub-komponenttiin
  - Step-importit korjattu: `./onboarding/Step*` (ei `../onboarding/Step*`)
- **Task 3:** `app/business/onboarding/page.tsx` päivitetty — `OnboardingWizardInner` → `WizardInner mode="onboarding"`
- **Task 4:** `app/business/[id]/page.tsx` päivitetty — `EditWizardInner` → `WizardInner mode="edit" paikka={paikka} paikkaId={paikkaId}`
- **Task 5:** `OnboardingWizardInner.tsx` ja `EditWizardInner.tsx` poistettu. TypeScript kompiloi puhtaasti.

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 2 | 215e3b2 | feat(40-03): create WizardInner.tsx with OnboardingMode + EditMode sub-components |
| Task 3 | 1e16685 | feat(40-03): update onboarding/page.tsx to use WizardInner mode=onboarding |
| Task 4 | 9835a62 | feat(40-03): update [id]/page.tsx to use WizardInner mode=edit |
| Task 5 | c66f263 | feat(40-03): delete OnboardingWizardInner + EditWizardInner; clean up stale comment |

## Files Created/Modified

| File | Change |
|------|--------|
| app/business/WizardInner.tsx | Created (421 lines) |
| app/business/onboarding/page.tsx | Updated (import + render) |
| app/business/[id]/page.tsx | Updated (import + render + stale comment removed) |
| app/business/onboarding/OnboardingWizardInner.tsx | Deleted |
| app/business/[id]/EditWizardInner.tsx | Deleted |

## Verification Evidence

```
test -f "app/business/WizardInner.tsx" → EXISTS
test -f "app/business/onboarding/OnboardingWizardInner.tsx" → DELETED
test -f "app/business/[id]/EditWizardInner.tsx" → DELETED
grep 'mode="onboarding"' app/business/onboarding/page.tsx → MATCH
grep 'mode="edit"' app/business/[id]/page.tsx → MATCH
npx tsc --noEmit | grep -i wizard → (empty — no errors)
grep -r "OnboardingWizardInner" app/ → EMPTY
grep -r "EditWizardInner" app/ → EMPTY
```

## Decisions Made

- **Stale comment poistettu**: `[id]/page.tsx`-tiedostossa oli kommentti "Auth guard is client-side in EditWizardInner" — kommentti viittasi poistettuun komponenttiin ja oli virheellinen Phase 39:n middleware-guard:n jälkeen. Poistettu plan-ohjeen mukaan ("Claude's discretion").
- **Logic verbatim**: Logiikkaa ei refaktoroitu eikä yksinkertaistettu — ainoastaan rakenteellinen muutos (private sub-komponentit + exported shell).

## Deviations from Plan

None — plan executed exactly as written. All must_haves.truths confirmed true:
1. WizardInner.tsx exists with mode discriminated union props ✓
2. Private OnboardingMode and EditMode sub-components ✓
3. OnboardingMode has all 6 steps, ProgressBar, maxReachedStep guard, draft loading, saveAndAdvance ✓
4. EditMode has tab bar, 5 tabs, free navigation, PreviewModal, local state ✓
5. onboarding/page.tsx uses WizardInner mode="onboarding" ✓
6. [id]/page.tsx uses WizardInner mode="edit" paikka paikkaId ✓
7. OnboardingWizardInner.tsx and EditWizardInner.tsx deleted ✓
8. TypeScript compiles cleanly ✓

## Known Stubs

None — no stubs, placeholders, or hardcoded values introduced.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced.

---
*Phase: 40-wizard-konsolidointi-cleanup*
*Completed: 2026-06-12*
