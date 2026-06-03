---
phase: 27-siivous-pienet-korjaukset
plan: 05
subsystem: ui
tags: [framer-motion, sheet, gradient, etusivu, overlay]

# Dependency graph
requires:
  - phase: 27-04
    provides: Etusivu.tsx with cluster zoom, MapClusterZoom component
provides:
  - UI-24: gradient fade overlay at bottom of sheet card list
  - SHEET-05: sheet max height reduced so TODO button stays uncovered
  - SHEET-06: CalloutCard tap opens PaikkaSheet immediately at zoom >= 16
affects: [etusivu, sheet, callout-card]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "position:absolute gradient sibling outside overflow-y-auto scroll container clips to outer overflow:hidden parent"
    - "zoomRef.current fast-path: skip animation when already at target zoom level"

key-files:
  created: []
  modified:
    - app/components/Etusivu.tsx

key-decisions:
  - "Gradient overlay placed as sibling after scroll container (not inside it) so it does not scroll with content; clipped by outer overflow:hidden"
  - "SHEET-05 uses Math.min(fullH*0.82, fullH-108) — the 108px gap ensures TODO button (top:60px, bottom:100px) stays uncovered with 8px safety margin"
  - "SHEET-06 fast path checks zoomRef.current >= 16 (not state zoomLevel) to avoid React re-render timing issues"
  - "Pre-existing TS errors in worktree (SPORT_ICONS, isSaved) are worktree artifact from older lib/lajit.ts and DiagonaalKortti.tsx — confirmed clean compile on master"

patterns-established:
  - "Fast-path zoom check: use zoomRef.current (ref, synchronous) not zoomLevel (state, async) for immediate decisions"

requirements-completed: [UI-24, SHEET-05, SHEET-06]

# Metrics
duration: 15min
completed: 2026-06-03
---

# Phase 27 Plan 05: Siivous & Pienet Korjaukset — Sheet UX Polishes Summary

**Sheet gains gradient fade overlay (UI-24), TODO-button-clearing max height (SHEET-05), and instant CalloutCard-tap-to-sheet with zero animation delay (SHEET-06)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-03T00:00:00Z
- **Completed:** 2026-06-03T00:15:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Added 64px `linear-gradient(to bottom, transparent, rgba(255,255,255,0.92))` overlay as an `aria-hidden` sibling div after the sheet's scroll container — clipped naturally by the outer `overflow:hidden` glass div
- Replaced `contentH = Math.round(fullH * 0.82)` with `Math.min(fullH * 0.82, fullH - 108)` so the sheet top edge is always at least 108px from the viewport bottom-of-TODO-button (100px + 8px safety margin)
- CalloutCard `onClick` now calls `setValittu(p)` directly when `zoomRef.current >= 16`, bypassing the 700ms MapAutoZoom animation entirely; fallback `pendingValittuRef` path retained for edge cases

## Task Commits

Each task was committed atomically:

1. **Task 1+2: UI-24 gradient fade + SHEET-05 max height + SHEET-06 instant tap** - `139d317` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `app/components/Etusivu.tsx` - Three targeted edits: gradient overlay div, contentH formula, CalloutCard onClick fast path

## Decisions Made
- Gradient overlay is placed as a sibling after the `overflow-y-auto` scroll `motion.div`, not inside it. The outer `motion.div.glass` has `overflow: 'hidden'`, so the overlay clips correctly to the sheet boundary without any extra CSS.
- `rgba(255,255,255,0.92)` chosen as gradient end-color to match the glass surface; developers can tune if visual mismatch appears on a specific device.
- The SHEET-06 fast path uses `zoomRef.current` (a ref) instead of the `zoomLevel` state variable to get a synchronous, non-stale zoom value at click time.

## Deviations from Plan

None — plan executed exactly as written.

Note: Two pre-existing TypeScript errors were present in the worktree due to the worktree branch being behind master on `lib/lajit.ts` (missing `SPORT_ICONS`) and `DiagonaalKortti.tsx` (missing `isSaved` prop). These are not caused by this plan's changes; `npx tsc --noEmit` passes cleanly on master.

## Issues Encountered
- Worktree was 65 commits behind master; `app/components/Etusivu.tsx` in the worktree was the older 1265-line version without phase 27-01 to 27-04 changes. Resolution: copied the master version (`git show master:app/components/Etusivu.tsx`) into the worktree before applying this plan's edits.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 27 is complete; all five plans executed
- Etusivu.tsx has UI-24 gradient, SHEET-05 height cap, and SHEET-06 instant tap
- No blockers for merge to master

---
*Phase: 27-siivous-pienet-korjaukset*
*Completed: 2026-06-03*
