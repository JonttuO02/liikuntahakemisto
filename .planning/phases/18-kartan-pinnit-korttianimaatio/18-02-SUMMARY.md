---
phase: 18-kartan-pinnit-korttianimaatio
plan: "02"
subsystem: ui
tags: [google-maps, clustering, framer-motion, typescript]

# Dependency graph
requires:
  - phase: 18-01
    provides: clusterPinUrl export from lib/sportPins.ts
provides:
  - Same-address venue clustering (±0.0001°) with glass popup
  - expandedCluster state and mapItems useMemo in Etusivu.tsx
  - Cluster AdvancedMarker with numbered pin and AnimatePresence popup
affects:
  - 18-03 (in-place card expansion — setValittu already wired from popup)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Record<string, T[]> for coordinate grouping (TS 5.9 compat vs Map<K,V> generic)"
    - "Discriminated union mapItems (type: single | cluster) for type-safe render branching"
    - "expandedCluster === item.items identity comparison for stable popup reference"

key-files:
  created: []
  modified:
    - app/components/Etusivu.tsx

key-decisions:
  - "Used Record<string,T[]> instead of Map<K,V> due to TS 5.9.3 type argument regression on Map constructor"
  - "Used reference equality (expandedCluster === item.items) for popup toggle — avoids JSON stringify overhead"

patterns-established:
  - "Cluster popup: absolute positioned inside position:relative wrapper div inside AdvancedMarker"

requirements-completed: [MAP-09]

# Metrics
duration: 18min
completed: 2026-05-29
---

# Phase 18 Plan 02: Same-Address Clustering Summary

**Same-address venue clustering via ±0.0001° coordinate grouping — cluster pins show count, glass popup lists venues with laji badges**

## Performance

- **Duration:** 18 min
- **Started:** 2026-05-29T00:00:00Z
- **Completed:** 2026-05-29T00:18:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- `mapItems` useMemo groups `paikatKartalla` by rounded coordinate key (±0.0001° = ~11m precision) into discriminated union of single/cluster items
- Cluster AdvancedMarkers render `clusterPinUrl(count)` numbered red pin; tapping toggles glass popup listing all co-located venues
- Single-venue markers render identically to before — pin/mini-card toggle at zoom threshold unchanged
- Map `onClick` clears both `valittu` and `expandedCluster`; popup `onClick` stops propagation

## Task Commits

1. **Task 1: expandedCluster state + mapItems useMemo + Map onClick update** - `b9bee14` (feat)
2. **Task 2: Replace marker loop with mapItems, add cluster popup** - `adc2c94` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `app/components/Etusivu.tsx` — expandedCluster state, mapItems useMemo, updated Map onClick, mapItems.map render loop with cluster branch and glass popup

## Decisions Made

- Used `Record<string, T[]>` for coordinate grouping instead of `new Map<K,V>()` — TypeScript 5.9.3 produces `TS7009` / `TS2558` errors when using Map with explicit type arguments in this codebase's tsconfig context; Record avoids the issue with identical runtime semantics
- Used reference equality `expandedCluster === item.items` (not deep comparison) to toggle the popup — the array reference from `mapItems` is stable within the same memo computation, making identity check reliable and fast

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used Record<string,T[]> in place of Map<K,V>**
- **Found during:** Task 1 (mapItems useMemo)
- **Issue:** TypeScript 5.9.3 raises `'new' expression, whose target lacks a construct signature` and `Expected 0 type arguments, but got 2` on `new Map<string, T[]>()` — a TS 5.9 regression. The plan specified Map<K,V>
- **Fix:** Replaced with `const groups: Record<string, T[]> = {}` / `Object.values(groups)` — equivalent semantics, no TS issue
- **Files modified:** app/components/Etusivu.tsx
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** b9bee14 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — implementation bug caused by TS 5.9.3 regression)
**Impact on plan:** No functional change — Record<string,T[]> is semantically equivalent to Map<string,T[]> for this use case. No scope creep.

## Issues Encountered

TypeScript 5.9.3 does not accept `new Map<K,V>()` with explicit type arguments in this project context, causing cascading `unknown` type errors in the useMemo body. Switched to `Record<string, T[]>` annotation style which TypeScript handles correctly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Cluster pins and popup complete; `setValittu(venue)` is wired in popup onClick — plan 18-03 (in-place card expansion) can hook into `valittu` as designed
- No blockers

---
*Phase: 18-kartan-pinnit-korttianimaatio*
*Completed: 2026-05-29*
