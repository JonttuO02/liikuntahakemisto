---
phase: 20-navigaatio-korjaukset
plan: "02"
subsystem: navigation
tags: [nav, sessionStorage, scroll-restore, sheet-animation, back-navigation]
dependency_graph:
  requires: []
  provides:
    - "onCardClick callback on DiagonaalKortti for scroll-state capture"
    - "sessionStorage 'etusivu-scroll-state' schema"
    - "sheetPhase starts closed, auto-opens on mount"
  affects:
    - app/components/Etusivu.tsx
    - app/components/DiagonaalKortti.tsx
tech_stack:
  added: []
  patterns:
    - "sessionStorage read-delete-restore pattern (clear on read)"
    - "requestAnimationFrame for post-state-flush scroll restore"
    - "focusId guard in mount effect to prevent auto-open on /?id=X"
key_files:
  created: []
  modified:
    - app/components/DiagonaalKortti.tsx
    - app/components/Etusivu.tsx
decisions:
  - "sheetPhase initial value changed from 'open' to 'closed' so homepage loads with pill visible"
  - "Auto-open effect guards on focusId: if /?id=X is present, focusId effect handles the sheet"
  - "sessionStorage key deleted immediately on read (before any state setter) to prevent re-apply on subsequent visits"
  - "searchResultsRef attaches to the motion.div (scroll container) so scrollTop can be captured in handleCardClick"
metrics:
  duration: "4m"
  completed_date: "2026-05-30T13:30:05Z"
  tasks_completed: 2
  files_modified: 2
---

# Phase 20 Plan 02: Navigaatio-korjaukset — sheet-avaus & scroll-palautus — Summary

## One-liner

Bottom sheet animates open from closed pill state on homepage load (NAV-03); navigating back from a venue profile restores exact scroll position and all 5 search filters via sessionStorage (NAV-01).

## What Was Built

### Task 1: DiagonaalKortti — onCardClick prop (NAV-01)

Three minimal changes to `DiagonaalKortti.tsx`:
- Added `onCardClick?: () => void` to `DiagonaalKorttiProps` interface
- Destructured `onCardClick` in function signature
- Added `onClick={() => onCardClick?.()}` to the full-card `Link` element (fires before navigation, no `preventDefault`)

### Task 2: Etusivu — sheetPhase init, auto-open effect, scroll restore, handleCardClick, ref (NAV-01 + NAV-03)

Six targeted edits to `Etusivu.tsx`:
1. `sheetPhase` initial value: `'open'` → `'closed'`
2. Added `const searchResultsRef = useRef<HTMLDivElement>(null)` after existing refs
3. Added `handleCardClick()` function: captures `scrollTop` + all 5 filter states into `sessionStorage.setItem('etusivu-scroll-state', ...)`
4. Added sessionStorage restore effect (first `useEffect`): reads → deletes → restores state → `requestAnimationFrame` for `scrollTop`
5. Added auto-open effect immediately before `focusId` effect: `if (!focusId) setSheetPhase('open')` — fires on mount, guarded so it does not run when `/?id=X` is present
6. Added `ref={searchResultsRef}` to search-results `motion.div`; added `onCardClick={handleCardClick}` to `DiagonaalKortti` usage

## NAV-02 Confirmation

"Näytä kartalla" from `/paikat/[id]` already uses `/?id=${paikka.id}` URL (verified in plan research). The `focusId` effect at lines ~370–380 handles map centering and sets `sheetPhase('sliding')`. No code changes needed — NAV-02 is confirmed correct.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `SPORT_ICONS` and dead lucide imports from Etusivu.tsx**
- **Found during:** Task 1 (first build attempt)
- **Issue:** Phase 19 refactored sport icon rendering into `DiagonaalKortti.tsx` but left behind `SPORT_ICONS: Record<string, LucideIcon>` const and 7 lucide icon imports (`Dumbbell, Waves, Leaf, Building2, Zap, Target, Activity` + `LucideIcon`) in `Etusivu.tsx`. ESLint `@typescript-eslint/no-unused-vars` flagged this as a build error.
- **Fix:** Removed the two dead import lines and the `SPORT_ICONS` const block from Etusivu.tsx
- **Files modified:** `app/components/Etusivu.tsx`
- **Commit:** 30cb5c0

## Known Stubs

None — no placeholder data or unconnected components.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. The `sessionStorage` key stores only UI state (scroll offset + filter strings + booleans), has no PII, and is cleared on first read per T-20-02/T-20-03 in the plan's threat register.

## Self-Check: PASSED

- app/components/DiagonaalKortti.tsx — FOUND
- app/components/Etusivu.tsx — FOUND
- .planning/phases/20-navigaatio-korjaukset/20-02-SUMMARY.md — FOUND
- Commit 30cb5c0 — FOUND
- Commit 7f8ad01 — FOUND
