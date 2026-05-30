---
phase: 18-kartan-pinnit-korttianimaatio
plan: "01"
subsystem: ui
tags: [google-maps, svg, pins, framer-motion]

requires:
  - phase: 17-toolbar-haku-ux
    provides: Etusivu.tsx with search/filter toolbar — base file for pin render changes

provides:
  - "pinUrl(laji) — fixed red (#ef4444) teardrop pin with white circle + dark icon stroke"
  - "clusterPinUrl(count) — numbered cluster pin in same red style"
  - "Etusivu.tsx updated to call pinUrl(p.laji) without color argument"

affects:
  - 18-02 (clustering uses clusterPinUrl)

tech-stack:
  added: []
  patterns:
    - "buildPinSvg() helper shared between pinUrl and clusterPinUrl — single source of truth for pin shape"
    - "Icon SVG positioned at x=7 y=7 width=14 height=14 within 28x38 viewBox for good visual proportion"

key-files:
  created: []
  modified:
    - lib/sportPins.ts
    - app/components/Etusivu.tsx

key-decisions:
  - "Icon size increased from 10x10 to 14x14 (x=7 y=7) for better visual proportion at 28x38 pin size"
  - "buildPinSvg() helper extracted to avoid duplicating teardrop path + white circle in pinUrl and clusterPinUrl"
  - "clusterPinUrl clamps display at 9+ to avoid text overflow in 8px font inside r=8 white circle"

patterns-established:
  - "Pin color is always #ef4444 — sport identity communicated by icon shape, not color"
  - "White circle (r=8 at cx=14 cy=14) provides consistent backdrop for dark (#374151) icon strokes"

requirements-completed:
  - MAP-08

duration: 5min
completed: 2026-05-29
---

# Phase 18 Plan 01: Unified Red Pins with Sport SVG Icons Summary

**Rewrote lib/sportPins.ts to use fixed #ef4444 red for all pins with white circle background and dark #374151 icon strokes, and removed per-sport color lookup from Etusivu.tsx pin render**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-29T16:30:00Z
- **Completed:** 2026-05-29T16:35:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- All map pins now render with uniform #ef4444 red teardrop — no more rainbow of per-sport colors
- White circle background (r=8) inside each pin provides clear backdrop for sport icon
- Sport icon stroke changed from white to #374151 (dark gray) for contrast on white background
- Icon display size increased from 10x10 to 14x14 px for better visual proportion at 28x38 pin size
- New clusterPinUrl(count) export ready for plan 18-02 clustering — shows count text instead of sport icon
- Etusivu.tsx per-pin color variable removed; pinUrl called with single laji argument
- Mini-card laji badges unchanged — lajiKonfig.color still used for colored sport badges

## Task Commits

1. **Task 1 + Task 2: Rewrite sportPins.ts + update Etusivu.tsx** - `3546ba8` (feat)

## Files Created/Modified
- `lib/sportPins.ts` — Rewrote: removed color param, fixed #ef4444 fill, white circle, #374151 stroke, added clusterPinUrl
- `app/components/Etusivu.tsx` — Removed per-pin color lookup line, updated pinUrl call to single argument

## Decisions Made
- Icon size 14x14 instead of plan's suggested 10x10: 10x10 was the original size; 14x14 (with x=7 y=7) fills the white circle better at 28x38 pin dimensions
- Extracted buildPinSvg() helper to DRY the teardrop SVG shared between pinUrl and clusterPinUrl

## Deviations from Plan

None - plan executed exactly as written. Minor implementation detail: used buildPinSvg() helper (not in plan) to avoid repeating the teardrop path + white circle — straightforward refactor, no behavioral difference.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- clusterPinUrl(count) is exported and ready for plan 18-02 to use for marker clustering
- pinUrl(laji) signature is now single-argument; plan 18-02 import requires no changes

---
*Phase: 18-kartan-pinnit-korttianimaatio*
*Completed: 2026-05-29*
