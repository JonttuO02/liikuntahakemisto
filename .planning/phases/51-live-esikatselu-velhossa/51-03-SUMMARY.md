---
phase: 51-live-esikatselu-velhossa
plan: 03
subsystem: business-onboarding-wizard
tags: [live-preview, debounce, react-context, onboarding-steps]
status: complete
dependency-graph:
  requires:
    - lib/livePreview/LivePreviewContext.tsx (useLivePreview, SET_HINNASTO/SET_AUKIOLOAJAT/SET_YHTEYSTIEDOT/SET_MEDIA actions)
    - lib/livePreview/useDebouncedPreviewField.ts (useDebouncedValue)
  provides:
    - app/business/onboarding/StepHinnasto.tsx (debounced SET_HINNASTO dispatch)
    - app/business/onboarding/StepAukioloajat.tsx (debounced SET_AUKIOLOAJAT dispatch)
    - app/business/onboarding/StepYhteystiedot.tsx (debounced SET_YHTEYSTIEDOT dispatch)
    - app/business/onboarding/StepMediat.tsx (instant SET_MEDIA dispatch)
  affects:
    - app/business/WizardInner.tsx (must mount LivePreviewProvider above these steps — Plan 02's responsibility)
tech-stack:
  added: []
  patterns:
    - "Outward dispatch channel alongside existing save-on-submit flow: a useEffect observes local form state (raw or debounced) and dispatches into the shared live-preview context, without touching handleNext/handleSave"
key-files:
  created: []
  modified:
    - app/business/onboarding/StepHinnasto.tsx
    - app/business/onboarding/StepAukioloajat.tsx
    - app/business/onboarding/StepYhteystiedot.tsx
    - app/business/onboarding/StepMediat.tsx
decisions:
  - "StepHinnasto/StepAukioloajat/StepYhteystiedot debounce at 280ms (useDebouncedValue default) per D-04 — free-text/numeric fields"
  - "StepMediat dispatches instantly (no debounce) per D-05 — reuses local URL.createObjectURL blob preview as the live image source, mirroring the existing stagedPreviewUrls pattern"
  - "All four steps' existing handleNext/handleSave/onSaveComplete save-on-submit code paths are untouched — dispatches are purely additive observers of existing state"
metrics:
  duration: "20min"
  completed: 2026-06-18
---

# Phase 51 Plan 3: Wizard Step Live-Preview Dispatch Summary

Wired all four numbered onboarding wizard step components (`StepHinnasto`, `StepAukioloajat`, `StepYhteystiedot`, `StepMediat`) to push their in-progress field values into the shared live-preview context (`lib/livePreview/LivePreviewContext.tsx`) as the user edits — debounced ~280ms for free-text/numeric fields per D-04, instant for logo/photo blob URLs per D-05 — while leaving the existing save-on-submit flow (`handleNext`/`handleSave`/`onSaveComplete`, the `save-step`/`update-paikka` fetch calls) completely untouched.

## What Was Built

### Task 1: Debounced dispatch — StepHinnasto, StepAukioloajat, StepYhteystiedot
- All three call `const { dispatch } = useLivePreview()` at the top of the component
- **StepHinnasto**: `useDebouncedValue(rows, 280)` feeds a `useEffect` that dispatches `SET_HINNASTO` with the same `{ kategoria, hinta, lisatieto }[]` projection (filtered to non-empty `hinta`) used by `handleNext`'s existing save payload
- **StepYhteystiedot**: combines `{ puhelin, email, website, kuvaus }` into one object, debounces it, and dispatches `SET_YHTEYSTIEDOT` with the same shape in a `useEffect`
- **StepAukioloajat**: debounces the full `hours` state, then re-derives the `Record<string, { open, close }>` of open days (mirroring `buildOpenDaysObject`) inside the effect before dispatching `SET_AUKIOLOAJAT`
- `updateRow`, `toggleDay`, `updateTime`, `handleNext`, `handleSave`, `onSaveComplete` are byte-identical to before — only additive imports/hooks/effects were added

### Task 2: Instant dispatch — StepMediat
- Added `logoPreviewUrl` — a `useMemo`-derived `URL.createObjectURL(logoFiles[0])` blob URL mirroring the existing `stagedPreviewUrls` pattern (lines 59-65), with its own `URL.revokeObjectURL` cleanup effect to prevent leaks (T-51-04 mitigation)
- A `useEffect` keyed on `[logoPreviewUrl, stagedPreviewUrls, existingLogoUrl, existingPhotoUrls, dispatch]` dispatches `SET_MEDIA` immediately — no debounce, per D-05 — with `logo: logoPreviewUrl ?? existingLogoUrl ?? null` and `photos: [...existingPhotoUrls, ...stagedPreviewUrls]`
- The Supabase Storage upload flow (`supabase.storage.from('business-media').upload(...)`) in both `handleNext` and `handleSave` is unchanged; the blob URLs are preview-only and never persisted

## Verification

- `npx tsc --noEmit` — zero errors project-wide (confirmed after both tasks)
- Source assertions confirmed via grep:
  - All three Task-1 files contain both `useLivePreview` and `useDebouncedValue`
  - `StepHinnasto` contains `SET_HINNASTO`, `StepYhteystiedot` contains `SET_YHTEYSTIEDOT`, `StepAukioloajat` contains `SET_AUKIOLOAJAT`
  - All three retain their original `save-step`/`update-paikka` fetch calls
  - `StepMediat` contains `useLivePreview` and `SET_MEDIA`, and does NOT contain `useDebouncedValue` (instant per D-05)
  - `StepMediat` retains its `supabase.storage...upload(...)` calls (multi-line, confirmed via line-anchored grep) in both `handleNext` and `handleSave`
  - `URL.revokeObjectURL` appears twice in `StepMediat.tsx` (existing photo cleanup + new logo cleanup)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. `LivePreviewProvider` is not yet mounted in `WizardInner.tsx` (that is Plan 02's scope, running in a parallel wave) — `useLivePreview()` will throw if any of these four step components render outside a provider today. This is expected or intermediate parallel-wave state, not a stub introduced by this plan; the dispatches themselves are fully implemented and correct once the provider is mounted.

## Threat Flags

None. Per the plan's `threat_model`: dispatches only mutate local preview state; the unmodified save routes remain the sole validated write path. The one identified threat (blob URL leak, T-51-04) was mitigated by reusing the existing `URL.revokeObjectURL` cleanup pattern for the new logo blob URL.

## Self-Check: PASSED

- FOUND: app/business/onboarding/StepHinnasto.tsx
- FOUND: app/business/onboarding/StepAukioloajat.tsx
- FOUND: app/business/onboarding/StepYhteystiedot.tsx
- FOUND: app/business/onboarding/StepMediat.tsx
- FOUND commit 03c4ea5 (Task 1)
- FOUND commit 1dcb41b (Task 2)
