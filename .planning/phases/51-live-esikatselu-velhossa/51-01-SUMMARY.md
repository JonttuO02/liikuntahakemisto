---
phase: 51-live-esikatselu-velhossa
plan: 01
subsystem: business-onboarding-wizard
tags: [react-context, reducer, live-preview, onboarding]
status: complete
dependency-graph:
  requires: []
  provides:
    - lib/livePreview/LivePreviewContext.tsx (LivePreviewProvider, useLivePreview)
    - lib/livePreview/useDebouncedPreviewField.ts (useDebouncedValue)
  affects:
    - app/business/WizardInner.tsx (consumed by Plans 02/03/04)
tech-stack:
  added: []
  patterns:
    - "First React Context + reducer in app/lib — scoped to the wizard tree"
key-files:
  created:
    - lib/livePreview/LivePreviewContext.tsx
    - lib/livePreview/useDebouncedPreviewField.ts
  modified: []
decisions:
  - "Reducer state (PreviewDraft) mirrors buildDraftAsPaikka's draft input shape exactly, so existing builders consume it unchanged"
  - "brandColor/accentColor derivation duplicated verbatim from StepEsikatselu (not yet refactored to import from the provider) — Plan 02/03/04 will replace StepEsikatselu's local derivation with the context-derived values"
metrics:
  duration: "15min"
  completed: 2026-06-18
---

# Phase 51 Plan 1: Shared Live-Preview Context Summary

Created the shared live-preview state mechanism — a React Context + reducer (the first in `app/`/`lib/`) that accumulates in-progress wizard field values and derives a `Liikuntapaikka`-shaped preview object plus `brandColor`/`accentColor`, by calling the existing `buildDraftAsPaikka`/`buildBrandingPreview` builders unchanged, plus a debounce hook for free-text fields.

## What Was Built

### Task 1: `lib/livePreview/LivePreviewContext.tsx`
- `PreviewDraft` type — reducer state shape mirroring `buildDraftAsPaikka`'s `draft` input (`paikka_id`, `media_urls`, `hinnasto`, `aukioloajat`, `yhteystiedot`)
- `LivePreviewAction` — discriminated union: `SET_HINNASTO`, `SET_AUKIOLOAJAT`, `SET_YHTEYSTIEDOT` (merges with existing), `SET_MEDIA` (merges logo/photos), `RESET`
- `livePreviewReducer` — immutable spread-based reducer implementing the above actions
- `LivePreviewProvider` — accepts `paikkaInfo`, `paikkaId`, `brandingData?`, `initialDraft?`, `children`; derives `livePreviewPaikka` via `useMemo` replicating `StepEsikatselu`'s exact branching logic (brandingData path when present + numeric `paikka_id`, else `buildDraftAsPaikka`, else `null`); derives `brandColor`/`accentColor` using the identical sourcing chain from `StepEsikatselu` (`selected_background_color` ?? colors.find(role==='background').hex, etc.)
- `useLivePreview()` — hook reading the context, throws if used outside the provider
- No Supabase/fetch calls — purely synchronous derivation from props + dispatched state (LIVEPREV-04)

### Task 2: `lib/livePreview/useDebouncedPreviewField.ts`
- `useDebouncedValue<T>(value, delayMs = 280)` — `useState` + `useEffect`-with-cleanup debounce hook mirroring `StepMediat`'s `stagedPreviewUrls` set-in-effect/clear-in-cleanup pattern; default delay 280ms sits within D-04's 250-300ms window

## Verification

- `npx tsc --noEmit` — zero errors in either new file, and zero errors project-wide
- Grep confirms `buildDraftAsPaikka` and `buildBrandingPreview` are both imported and called in `LivePreviewContext.tsx`
- Grep confirms no `fetch(`, `supabase`, or `createBusinessBrowserClient` appears in `LivePreviewContext.tsx`
- Both files begin with the correct directives (`'use client'` for the context module; no directive needed for the pure hook module)
- File sizes: `LivePreviewContext.tsx` 179 lines (min 90), `useDebouncedPreviewField.ts` 38 lines (min 15)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. This plan produces pure library/state code with no UI rendering — nothing in this plan flows to a rendered component yet (that's Plans 02/03/04's job, which will wire `LivePreviewProvider` into `WizardInner.tsx` and consume `useLivePreview()`/`useDebouncedValue()` from the step components).

## Threat Flags

None. Confirmed in plan's threat_model: pure client-side derived state, no new trust boundary, no new packages installed.

## Self-Check: PASSED

- FOUND: lib/livePreview/LivePreviewContext.tsx
- FOUND: lib/livePreview/useDebouncedPreviewField.ts
- FOUND commit afebdb3 (Task 1)
- FOUND commit 2777930 (Task 2)
