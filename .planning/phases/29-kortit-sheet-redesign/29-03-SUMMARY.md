---
phase: 29-kortit-sheet-redesign
plan: "03"
subsystem: ui
tags: [lucide-react, DiagonaalKortti, placeholder, Building2, Camera]

# Dependency graph
requires:
  - phase: 28-svg-ikonit
    provides: SportIcon component used in left-panel sport pill
provides:
  - DiagonaalKortti with Building2 logo placeholder left of sport pill (UI-26)
  - DiagonaalKortti with gray + Camera right-panel fallback replacing sport-color + SportIcon (UI-27)
affects: [29-04-kortit-sheet-redesign, verifier]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Logo placeholder: w-10 h-10 rounded-lg bg-[rgba(0,0,0,0.06)] with Building2 size=20 text-[rgba(0,0,0,0.25)]"
    - "Right-panel image fallback: bg-[rgba(0,0,0,0.06)] with Camera size=24 text-[rgba(0,0,0,0.2)]"
    - "data-fallback + hidden={!!paikka.image_url} pattern preserved for onError JS wiring"

key-files:
  created: []
  modified:
    - app/components/DiagonaalKortti.tsx

key-decisions:
  - "Logo placeholder uses items-start on wrapper so 40px box and pill align top, not center — prevents name overflow in h-32 card"
  - "sport pill gets mt-1 to visually center against taller logo box without changing alignment axis"
  - "fallback div style={{ backgroundColor: laji.color }} removed entirely; bg-[rgba(0,0,0,0.06)] Tailwind class added instead"
  - "SportIcon still imported and used in sport pill — only removed from fallback div"

patterns-established:
  - "Placeholder icon pattern: gray bg-[rgba(0,0,0,0.06)] box + muted icon text-[rgba(0,0,0,0.2..0.25)]"

requirements-completed: [UI-26, UI-27]

# Metrics
duration: 8min
completed: 2026-06-04
---

# Phase 29 Plan 03: DiagonaalKortti Placeholder Icons Summary

**Building2 logo placeholder added left of sport pill, and gray+Camera right-panel fallback replaces sport-color+SportIcon in DiagonaalKortti**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-04T00:00:00Z
- **Completed:** 2026-06-04T00:00:00Z
- **Tasks:** 2 auto + 1 checkpoint pending
- **Files modified:** 1

## Accomplishments
- Added `Building2` and `Camera` to the lucide-react import (UI-26, UI-27)
- Wrapped sport pill in `flex items-start gap-2 self-start` container with 40x40 gray logo box (Building2) as first child
- Replaced sport-color + SportIcon right-panel fallback with neutral gray + Camera icon
- Preserved `data-fallback`, `aria-hidden`, `hidden={!!paikka.image_url}` — onError JS wiring intact
- Real-image `<img>` branch and onError handler left completely unchanged
- `npx tsc --noEmit` exits 0

## Task Commits

Each task was committed atomically:

1. **Task 1: Add logo placeholder to the left of the sport pill (UI-26)** - `cd3bd7c` (feat)
2. **Task 2: Replace right-panel fallback with gray + Camera (UI-27)** - `cd3bd7c` (feat, same commit — both changes in same file)

## Files Created/Modified
- `app/components/DiagonaalKortti.tsx` - Added Building2+Camera imports; badge row wrapped in flex container with logo box; fallback div restyled to gray+Camera

## Decisions Made
- Committed both tasks in a single atomic commit because they modify different regions of the same file (`DiagonaalKortti.tsx`) and cannot be staged independently after both edits were applied
- Used `items-start` on the badge wrapper so the 40px logo box aligns to top, preventing vertical overflow within the `h-32` card constraint

## Deviations from Plan
None — plan executed exactly as written.

## Issues Encountered
None.

## CHECKPOINT PENDING

**Type:** checkpoint:human-verify
**Gate:** blocking

### What was built
Logo placeholder (Building2 icon in gray 40x40 box) to the left of the sport pill in DiagonaalKortti's left panel, and gray+Camera right-panel fallback replacing the sport-color+SportIcon fallback.

### How to verify
1. Run `npm run dev` and open the app; switch to the map/card list view that renders DiagonaalKortti (the diagonal-split cards)
2. Find a venue WITHOUT an `image_url`: confirm the right panel is a **light gray box** with a **centered camera icon** (NOT a sport-colored panel with a sport icon)
3. Confirm the left panel's top row shows a **40x40 gray rounded box with a Building2 building icon** to the LEFT of the sport pill, both aligned to the top
4. Confirm the venue name below the badge row is **not clipped/pushed off** the 128px-tall card on a narrow (mobile) viewport
5. If any venue has a real `image_url`, confirm that image **still renders** in the right panel (placeholder only shows when there is no image)

### Resume signal
Type "approved" or describe layout issues (e.g. name clipped, box overflowing clipPath)

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- UI-26 and UI-27 complete pending human checkpoint approval
- DiagonaalKortti ready for Phase 29 wave 2 plans that may depend on updated card layout

---
*Phase: 29-kortit-sheet-redesign*
*Completed: 2026-06-04*
