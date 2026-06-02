---
phase: 26-filtterit
plan: 02
subsystem: ui
tags: [react, framer-motion, carousel, filter-pills, typescript, animation]

requires:
  - phase: 26-filtterit
    plan: 01
    provides: searchLaji as string[], searchKaupunki as string, dead filter state removed

provides:
  - FilterCarouselPill component in Etusivu.tsx — ambient carousel + chip expansion
  - Filter row with two carousel pills replacing select dropdowns
  - FILTER-03 compliance: no dropdowns, no Kertakäynti OK, no Auki nyt

affects: [26-filtterit, app/components/Etusivu.tsx]

tech-stack:
  added: []
  patterns:
    - "Carousel pill: setInterval cycles allItems (ambient) or selected items (multi-select), pauses at single-select"
    - "AnimatePresence mode=wait with key={idx} for opacity crossfade on text change"
    - "Chip list expand/collapse with AnimatePresence y-fade, closes on singleSelect after toggle"

key-files:
  created: []
  modified:
    - app/components/Etusivu.tsx

key-decisions:
  - "FilterCarouselPill is a local component in Etusivu.tsx (not a separate file) — minimal blast radius"
  - "Kaupunki pill: singleSelect=true, toggling same value restores to 'Kaikki'"
  - "Laji pill: singleSelect=false, multi-select toggle via Array.includes/filter"
  - "allItems.length in useEffect deps ensures interval restarts if sport list changes"
  - "Chip list has no outside-click handler per plan spec — pill button is the only toggle"

requirements-completed: [FILTER-03]

duration: 10min
completed: 2026-06-02
---

# Phase 26 Plan 02: Carousel Filter Pills Summary

**FilterCarouselPill component added to Etusivu.tsx — ambient cycling animation for laji/kaupunki selection replacing select dropdowns**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-06-02T15:45:00Z
- **Completed:** 2026-06-02T15:55:00Z
- **Tasks:** 2 (committed individually)
- **Files modified:** 1

## Accomplishments

- Added `FilterCarouselPillProps` interface and `FilterCarouselPill` function component above `export default function Etusivu`
- Component implements ambient carousel (cycles all items every 2s when 0 selected), static display at single selection, and cycling of selected values at 2+ selections
- `clearInterval` in useEffect cleanup prevents interval leak on unmount (T-26-04 mitigation)
- Replaced kaupunki `<select>` dropdown with KaupunkiPill (singleSelect=true, kaupunki threshold > 2 preserved)
- Added laji FilterCarouselPill (singleSelect=false, multi-select toggle)
- Added `kaupunkiItems` derived value alongside `kaupungit` useMemo
- TypeScript compiles with 0 errors throughout

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add FilterCarouselPill component | 454ffbc | app/components/Etusivu.tsx |
| 2 | Replace filter row JSX with carousel pills | f83ce71 | app/components/Etusivu.tsx |

## Files Created/Modified

- `app/components/Etusivu.tsx` — Added FilterCarouselPillProps interface + FilterCarouselPill component (91 lines); replaced filter row JSX with two FilterCarouselPill usages + kaupunkiItems derived value

## Decisions Made

- Component placed just above `export default function Etusivu` as local component — no new file needed
- No outside-click handler added per plan spec — chip list toggles only via pill button tap
- `allItems.length` added to carousel useEffect deps alongside `selected.length` to handle dynamic sport list edge cases

## Deviations from Plan

None — plan executed exactly as written.

## Verification Results

- `grep -c "Kertakäynti OK\|Auki nyt\|<select" Etusivu.tsx` → **0** (all removed)
- `grep -c "FilterCarouselPill" Etusivu.tsx` → **4** (interface + function + 2 usages)
- `grep "setInterval" Etusivu.tsx` → entries for CalloutCard (line 140) + FilterCarouselPill (line 246) + isDark timer (line 585)
- `npx tsc --noEmit` → 0 errors

## Known Stubs

None.

## Threat Flags

None. T-26-04 (setInterval leak) mitigated: clearInterval called in useEffect cleanup.

## Self-Check: PASSED

- `app/components/Etusivu.tsx` — FOUND (modified, committed)
- Commit 454ffbc — FOUND
- Commit f83ce71 — FOUND

---
*Phase: 26-filtterit*
*Completed: 2026-06-02*
