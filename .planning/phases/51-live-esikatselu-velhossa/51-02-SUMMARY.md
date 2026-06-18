---
phase: 51-live-esikatselu-velhossa
plan: 02
subsystem: business-onboarding-wizard
tags: [react, ui-components, live-preview, i18n]
status: complete
dependency-graph:
  requires:
    - lib/livePreview/LivePreviewContext.tsx (LivePreviewProvider, useLivePreview — Plan 01)
  provides:
    - app/business/onboarding/LivePreviewPane.tsx (default export, no props)
    - app/business/onboarding/LivePreviewToggle.tsx (default export, props: activeView/onChange)
    - messages/fi.json + messages/en.json Business.previewToggleEdit/previewToggleLive
  affects:
    - app/business/WizardInner.tsx (consumed by Plan 03 for desktop split-view + mobile toggle wiring)
tech-stack:
  added: []
  patterns:
    - "Pure presentation components consuming a shared context — no local data state"
key-files:
  created:
    - app/business/onboarding/LivePreviewPane.tsx
    - app/business/onboarding/LivePreviewToggle.tsx
  modified:
    - messages/fi.json
    - messages/en.json
decisions:
  - "LivePreviewPane renders only the inner two-card stack + captions + empty state — the outer w-[360px] sticky desktop wrapper is owned by Plan 03/WizardInner, not this component"
  - "Removed the literal string 'PaikkaSheet' from LivePreviewPane's doc comment (reworded to 'third profile-preview section') to satisfy the acceptance criteria's zero-occurrence check"
metrics:
  duration: "20min"
  completed: 2026-06-18
---

# Phase 51 Plan 2: Live Preview Presentation Components Summary

Built the two presentation components that render the wizard's live preview — `LivePreviewPane` (stacked CalloutCard/DiagonaalKortti column reading `useLivePreview()`) and `LivePreviewToggle` (the mobile Muokkaa/Esikatselu segmented control) — plus the two new i18n keys both locales need. Both components hold no data state of their own; they consume the shared context built in Plan 01.

## What Was Built

### Task 1: `app/business/onboarding/LivePreviewPane.tsx`
- `'use client'` default-export component, no props
- Calls `useLivePreview()` for `livePreviewPaikka`/`brandColor`/`accentColor` and `useTranslations('Business')`
- Empty state: exact spinner markup copied from `StepEsikatselu.tsx` lines 123-126 (`border-t-[#111111] animate-spin`) when `livePreviewPaikka` is null — no 8-second timeout/error branch, since live preview has placeholder data and no network call
- Populated state: `flex flex-col gap-4` (16px gap per UI-SPEC) two-card stack — caption + `CalloutCard` (with the `latitude/longitude ?? 0` null-coordinate shim) then caption + `DiagonaalKortti` — reusing existing `previewLabelCallout`/`previewLabelDiag` i18n keys
- No extra `.glass` wrapper around the cards (UI-SPEC forbids double-glass); no `PaikkaSheet` rendering

### Task 2: `app/business/onboarding/LivePreviewToggle.tsx` + i18n keys
- `'use client'` default-export component with props `{ activeView: 'edit' | 'preview'; onChange: (view) => void }`
- Renders the exact UI-SPEC segmented-control JSX: `.glass rounded-full p-1` track, two `motion.button` segments (`flex-1 h-9 rounded-full`) with `Pencil`/`Eye` icons (`w-3.5 h-3.5`, `lucide-react`), `whileTap={{ scale: 0.95 }}`, active `bg-[#111111] text-white` / inactive `text-[rgba(17,17,17,0.45)]` — matching `WizardInner.tsx`'s EditMode tab-bar tokens exactly
- Added `previewToggleEdit`/`previewToggleLive` to `messages/fi.json` (`"Muokkaa"`/`"Esikatselu"`) and `messages/en.json` (`"Edit"`/`"Preview"`) under the `Business` namespace, adjacent to the existing `previewLabel*` keys

## Verification

- `npx tsc --noEmit` — zero errors project-wide (confirmed after all 3 commits)
- `node -e "..."` — both `messages/fi.json` and `messages/en.json` parse and contain the new keys; `previewToggleEdit === "Muokkaa"`/`"Edit"` confirmed
- Grep confirms `LivePreviewPane.tsx` renders both `CalloutCard` and `DiagonaalKortti` (5 occurrences) and contains zero occurrences of the literal string `PaikkaSheet`
- Grep confirms the spinner class, the `latitude ?? 0` shim, both files begin with `'use client'`, `LivePreviewToggle.tsx` imports `Pencil`/`Eye`, uses `whileTap={{ scale: 0.95 }}` (×2), `bg-[#111111] text-white` (×2), and the `.glass rounded-full p-1` track class

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed literal "PaikkaSheet" string from LivePreviewPane.tsx doc comment**
- **Found during:** Task 1 verification (overall plan `<verification>` check)
- **Issue:** The file's top-of-file doc comment explained the component "drops the PaikkaSheet section," which technically violated the acceptance criteria's exact requirement that the file contain zero occurrences of the string `PaikkaSheet` (the grep check doesn't distinguish comments from code)
- **Fix:** Reworded the comment to "minus the third profile-preview section" without naming the component
- **Files modified:** `app/business/onboarding/LivePreviewPane.tsx`
- **Commit:** 966d69c

## Known Stubs

None. Both components are fully wired to the shared live-preview context built in Plan 01 and render existing, unchanged card components (`CalloutCard`, `DiagonaalKortti`). They are not yet mounted into `WizardInner.tsx` — that wiring (desktop split-view layout, mobile toggle state management, step/tab-change reset per D-08) is Plan 03's responsibility per the dependency graph, not a stub.

## Threat Flags

None. Confirmed in plan's threat_model: pure client-side presentation reading already-loaded context state, no new trust boundary, no new packages.

## Self-Check: PASSED

- FOUND: app/business/onboarding/LivePreviewPane.tsx
- FOUND: app/business/onboarding/LivePreviewToggle.tsx
- FOUND commit a93ad55 (Task 1)
- FOUND commit e5943ba (Task 2)
- FOUND commit 966d69c (Task 1 deviation fix)
