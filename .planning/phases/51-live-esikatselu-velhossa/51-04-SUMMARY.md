---
phase: 51-live-esikatselu-velhossa
plan: 04
subsystem: business-onboarding-wizard
tags: [live-preview, wizard-integration, edit-mode, requirements-correction]
status: complete
dependency-graph:
  requires:
    - lib/livePreview/LivePreviewContext.tsx (LivePreviewProvider, useLivePreview — Plan 01)
    - app/business/onboarding/LivePreviewPane.tsx (Plan 02)
    - app/business/onboarding/LivePreviewToggle.tsx (Plan 02)
    - app/business/onboarding/StepHinnasto.tsx / StepAukioloajat.tsx / StepYhteystiedot.tsx / StepMediat.tsx dispatch wiring (Plan 03)
  provides:
    - app/business/WizardInner.tsx (final integration — both modes render the live preview)
  affects: []
tech-stack:
  added: []
  patterns:
    - "Two LivePreviewProvider instances (one per WizardInner mode) — onboarding and EditMode never co-render, so this avoids needing a mode-agnostic seed shape"
key-files:
  created: []
  modified:
    - app/business/WizardInner.tsx
    - .planning/REQUIREMENTS.md
decisions:
  - "EditMode's LivePreviewProvider seeds initialDraft from local* tab-persisted state (localHinnasto/localAukioloajat/localYhteystiedot/localLogoUrl/localPhotoUrls) and paikkaInfo from the server-fetched paikka record; brandingData is null (EditMode has no branding analysis context, matching today's PreviewModal which passed none)"
  - "REQUIREMENTS.md had no literal Out-of-Scope row excluding the PreviewModal->CalloutCard swap to remove, so D-03 was applied as a clarifying note under the Live Preview section instead, stating EditMode's live preview is in scope and PreviewModal.tsx survives for the dashboard"
metrics:
  duration: "25min"
  completed: 2026-06-18
---

# Phase 51 Plan 4: WizardInner Integration — Live Preview in Both Modes Summary

Integrated the live preview into `WizardInner.tsx`: both `OnboardingMode` and `EditMode` now mount their own `LivePreviewProvider`, render the desktop 360px sticky `LivePreviewPane` column (`lg:` and above) and the mobile Muokkaa/Esikatselu `LivePreviewToggle` with full content swap (below `lg:`), and reset the toggle to `'edit'` on every step/tab change (D-08). EditMode's old click-to-open `previewOpen`/`PreviewModal`/`previewCta` flow is fully removed, while `PreviewModal.tsx` and its independent usage in the `/business` dashboard (`app/business/page.tsx`) are untouched.

## What Was Built

### Task 1: OnboardingMode — provider mount + split/toggle layout
- Added `LivePreviewProvider`, `LivePreviewPane`, `LivePreviewToggle` imports; removed the now-redundant top-level `PreviewModal` import (its only remaining call site was EditMode, removed in Task 2)
- Added `activeView` state (`'edit' | 'preview'`) and a `useEffect` keyed on `[step]` that resets it to `'edit'` on every step change (D-08)
- Wrapped the existing form column in the UI-SPEC desktop split-view wrapper (`flex gap-6 items-start justify-center`); added the `hidden lg:flex flex-col gap-4 w-[360px] flex-shrink-0 sticky top-6` preview column rendering `<LivePreviewPane />`
- Below `lg:`, the `LivePreviewToggle` sits above the `AnimatePresence` step content; when `activeView === 'preview'` the content area swaps to `<LivePreviewPane />` (full content swap, not overlay), reusing the existing opacity-only `duration: 0.2` crossfade
- Mounted `LivePreviewProvider` inside `OnboardingMode`'s return, seeded with `paikkaInfo`, `paikkaId`, `brandingData`, `initialDraft={draft}`

### Task 2: EditMode — PreviewModal removal + live preview + D-03 correction
- Removed `previewOpen` state, the `<AnimatePresence>{previewOpen && <PreviewModal .../>}</AnimatePresence>` block, and the `previewCta` button entirely
- `app/components/PreviewModal.tsx` and `app/business/page.tsx`'s independent dashboard usage are unmodified and confirmed intact
- Mounted a second `LivePreviewProvider` instance inside `EditMode`, seeded from `local*` state (`localHinnasto`, `localAukioloajat`, `localYhteystiedot`, `localLogoUrl`, `localPhotoUrls`) and `paikkaInfo` derived from the server-fetched `paikka` record; `brandingData={null}`
- Added the same desktop split-view column and mobile `LivePreviewToggle` (with `useEffect` reset keyed on `[currentStep]`) as OnboardingMode
- `REQUIREMENTS.md`: added a D-03 scope-correction note under the Live Preview section clarifying EditMode's live preview (CalloutCard/DiagonaalKortti) is in scope, and `PreviewModal.tsx` is kept solely for the dashboard

## Verification

- `npx tsc --noEmit` — zero errors project-wide after both tasks
- `grep -c "previewOpen" app/business/WizardInner.tsx` → 0
- `grep -c "<PreviewModal" app/business/WizardInner.tsx` → 0
- `test -f app/components/PreviewModal.tsx` → exists
- `grep -c "PreviewModal" app/business/page.tsx` → 2 (import + render, unchanged)
- `grep -c "LivePreviewProvider" app/business/WizardInner.tsx` → 3 (import + 2 mount sites)
- `grep -c "LivePreviewPane" app/business/WizardInner.tsx` → 5 (import + mobile/desktop slots in both modes)
- `grep -c "LivePreviewToggle" app/business/WizardInner.tsx` → 3 (import + 2 render sites)
- `git diff --diff-filter=D --name-only` across both task commits → empty (no unexpected file deletions)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] No literal Out-of-Scope exclusion row existed to remove for D-03**
- **Found during:** Task 2
- **Issue:** The plan instructed locating and rewording/removing an Out-of-Scope table row excluding the `PreviewModal.tsx` → `CalloutCard` swap. `REQUIREMENTS.md`'s current Out of Scope table (3 rows: headless browser, state-management library, form library) contains no such row — it appears to have already been absent or was never literally present as a table row.
- **Fix:** Per the plan's own fallback instruction ("If no such literal row exists ... add a clarifying note under the Live Preview section"), added a D-03 scope-correction note directly under the `### Live Preview` requirements list instead.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Commit:** d249a6f

## Known Stubs

None. Both modes are fully wired end-to-end: `LivePreviewProvider` → step/tab dispatch (Plan 03) → `LivePreviewPane`/`LivePreviewToggle` (Plan 02) → rendered `CalloutCard`/`DiagonaalKortti`. No placeholder data paths remain.

## Threat Flags

None beyond the plan's stated threat model. EditMode's provider seed sources from the already-RLS/ownership-verified `paikka` record (loaded via `app/business/[id]/page.tsx`'s RSC) and local edit state — no new write path, no new trust boundary. `PreviewModal.tsx` and its dashboard usage were verified intact rather than deleted, directly mitigating T-51-06.

## Self-Check: PASSED

- FOUND: app/business/WizardInner.tsx (modified, both tasks)
- FOUND: .planning/REQUIREMENTS.md (modified, Task 2)
- FOUND: app/components/PreviewModal.tsx (still exists on disk)
- FOUND commit ae9158d (Task 1)
- FOUND commit d249a6f (Task 2)
