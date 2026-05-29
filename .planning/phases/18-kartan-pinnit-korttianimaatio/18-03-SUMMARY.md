---
phase: 18-kartan-pinnit-korttianimaatio
plan: "03"
subsystem: ui
tags: [framer-motion, google-maps, advancedmarker, animatepresence, glassmorphism]

# Dependency graph
requires:
  - phase: 18-kartan-pinnit-korttianimaatio
    provides: plan 18-02 single-venue AdvancedMarker with pin/card AnimatePresence and valittu state
provides:
  - In-place expanded card above selected pin (key "expanded" in AdvancedMarker AnimatePresence)
  - Bottom sheet venue detail block removed (~150 lines deleted)
  - sheetPhase-valittu coupling useEffect removed
  - Three-way AnimatePresence: pin (zoom<16) / expanded (zoom>=16, selected) / card (zoom>=16, not selected)
affects: [18-kartan-pinnit-korttianimaatio, future venue detail phases]

# Tech tracking
tech-stack:
  added: []
  patterns: [in-place card expansion anchored above pin via position:absolute + bottom:calc(100%+8px), three-way AnimatePresence with mode="wait"]

key-files:
  created: []
  modified:
    - app/components/Etusivu.tsx

key-decisions:
  - "In-place card uses scale+opacity animation (duration 0.2) not spring, per CLAUDE.md animation rules"
  - "Wrapper div with position:relative added inside AdvancedMarker to anchor the absolute-positioned expanded card"
  - "valittu state is now fully map-layer only — no bottom sheet, no sheetPhase coupling"

patterns-established:
  - "Three-way AnimatePresence pattern: pin (far zoom) / expanded card (selected at close zoom) / mini-card (unselected at close zoom)"
  - "position:absolute card anchored above map pin via bottom:calc(100%+8px) inside position:relative wrapper"

requirements-completed: [MAP-10]

# Metrics
duration: 15min
completed: 2026-05-29
---

# Phase 18 Plan 03: In-Place Card Expansion Summary

**Bottom sheet deleted and replaced with in-place expanded card (280px, glass) animating above the selected AdvancedMarker pin via position:absolute + scale+opacity transition**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-05-29T12:00:00Z
- **Completed:** 2026-05-29T12:15:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Deleted EASE_DRAWER constant, the sheetPhase-valittu useEffect (3 lines), and the bottom-sheet AnimatePresence block (~150 lines) — all venue selection interaction now lives in the map layer
- Added `position:relative` wrapper div inside single-venue AdvancedMarker to serve as anchor for the absolute-positioned expanded card
- Extended single-venue AnimatePresence from two states (pin/card) to three states (pin/expanded/card) — "expanded" renders when `valittu?.id === item.paikka.id && zoomLevel >= 16`
- Expanded card contains: laji badge (color from lajiKonfig), venue name, open status, price, distance (if GPS), X close button, Näytä tiedot link

## Task Commits

1. **Task 1 + Task 2: Delete bottom sheet, add in-place expanded card** - `5abde77` (feat)

**Plan metadata:** (pending final docs commit)

## Files Created/Modified
- `app/components/Etusivu.tsx` - Deleted EASE_DRAWER + sheetPhase-valittu useEffect + bottom-sheet block; added three-way AnimatePresence with in-place expanded card

## Decisions Made
- Used `duration: 0.2` cubic animation (not spring) for expanded card per CLAUDE.md animation rules
- Wrapped single-venue AdvancedMarker content in `<div style={{ position: 'relative' }}>` — required for absolute positioning of expanded card, cluster markers already had this pattern
- Kept `valittu` state independent of `sheetPhase` — selection now driven only by pin tap (setValittu(p)) and close actions (setValittu(null) from X button or map onClick)

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- MAP-10 complete: venue selection is entirely map-layer, no bottom sheet
- Plan 18-04 (if any) can build on the in-place expanded card pattern
- The three-way AnimatePresence is ready; cluster popup already uses the same absolute-positioned card pattern from plan 18-02

---
*Phase: 18-kartan-pinnit-korttianimaatio*
*Completed: 2026-05-29*
