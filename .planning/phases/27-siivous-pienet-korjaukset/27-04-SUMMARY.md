---
phase: 27-siivous-pienet-korjaukset
plan: "04"
subsystem: ui
tags: [supercluster, google-maps, react, typescript, framer-motion]

# Dependency graph
requires:
  - phase: 27-03
    provides: Etusivu.tsx with cluster markers and expandedCluster popup state
provides:
  - MAP-16: cluster clicks zoom map to expansion zoom level via getClusterExpansionZoom
  - MapClusterZoom helper component pattern inside Map context
  - expandedCluster state and popup JSX fully removed
affects: [27-05, future map interaction phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MapClusterZoom: useMap + useEffect helper (same as MapAutoZoom pattern) for zoom actions inside Map context"
    - "clusterZoomTarget state holds { zoom, center } target; cleared in onComplete callback"

key-files:
  created: []
  modified:
    - app/components/Etusivu.tsx

key-decisions:
  - "Use getClusterExpansionZoom (not getExpansionZoom — plan interface had wrong name); corrected per actual @types/supercluster declaration"
  - "Outer position:relative wrapper div around cluster AdvancedMarker content removed — it was only needed for the popup overflow context"

patterns-established:
  - "Map action components (MapPanController, MapAutoZoom, MapClusterZoom) follow the same pattern: useMap + useRef(onComplete) + useEffect + return null"

requirements-completed:
  - MAP-16

# Metrics
duration: 15min
completed: 2026-06-03
---

# Phase 27 Plan 04: Siivous — Cluster zoom behavior Summary

**MAP-16 cluster popup replaced with sc.getClusterExpansionZoom + map.setZoom/panTo via new MapClusterZoom helper; expandedCluster state and popup JSX fully deleted**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-03T18:35:00Z
- **Completed:** 2026-06-03T18:50:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Cluster AdvancedMarker click now zooms the map to the expansion zoom level and pans to cluster center
- expandedCluster state (and all popup JSX with AnimatePresence, motion.div, venue buttons) fully deleted
- New MapClusterZoom helper component follows the established MapPanController/MapAutoZoom pattern
- clusterZoomTarget state drives the zoom action, cleared in onComplete callback
- TypeScript compiles cleanly; no remaining expandedCluster or getLeaves references

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite cluster handler and delete expandedCluster state + popup JSX** - `4e26a49` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified

- `app/components/Etusivu.tsx` - Cluster handler rewritten: MapClusterZoom helper added, expandedCluster replaced with clusterZoomTarget, popup JSX deleted, Map onClick cleaned up, sc-change useEffect removed

## Decisions Made

- Used `getClusterExpansionZoom` instead of `getExpansionZoom` — the plan's interface section listed the wrong method name; the actual @types/supercluster declaration exposes `getClusterExpansionZoom`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected method name getExpansionZoom → getClusterExpansionZoom**
- **Found during:** Task 1 (TypeScript compilation check)
- **Issue:** Plan interface specified `sc.getExpansionZoom(clusterId)` but the actual @types/supercluster declares `getClusterExpansionZoom(clusterId)` — TypeScript error TS2339
- **Fix:** Changed call site to `sc.getClusterExpansionZoom(clusterId)` in the cluster onClick handler
- **Files modified:** app/components/Etusivu.tsx
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** 4e26a49 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — bug: wrong method name in plan interface)
**Impact on plan:** Essential fix for TypeScript correctness. No scope creep. Behavior is identical — same runtime method.

## Issues Encountered

- Plan interface section listed `sc.getExpansionZoom` but the Supercluster library exposes `getClusterExpansionZoom`. Caught immediately by TypeScript compiler check; corrected as Rule 1 auto-fix.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- MAP-16 complete; cluster tap-to-zoom fully functional
- Phase 27-05 (SHEET-04, SHEET-05, SHEET-06) can proceed without dependency on this change

---
*Phase: 27-siivous-pienet-korjaukset*
*Completed: 2026-06-03*
