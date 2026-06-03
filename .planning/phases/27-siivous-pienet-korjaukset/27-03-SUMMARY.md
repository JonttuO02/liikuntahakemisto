---
phase: 27-siivous-pienet-korjaukset
plan: "03"
subsystem: ui
tags: [react, framer-motion, etusivu, filter-pill, search]

# Dependency graph
requires:
  - phase: 27-01
    provides: /suosikit route removed, NavBar/NavPill nav links cleaned
  - phase: 27-02
    provides: PaikkaSheet browser link removed
provides:
  - CombinedFilterPill outer container has rgba(0,0,0,0.04) background tint (FILTER-04)
  - Collapsed search input row no longer intercepts map touches (FILTER-05)
  - Empty-state "Ei tuloksia" / "Tyhjennä haku" UI removed from search results (SEARCH-01)
affects: [27-04, 27-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "pointerEvents: listOpen ? undefined : 'none' on motion.div for exit-animation touch protection"

key-files:
  created: []
  modified:
    - app/components/Etusivu.tsx

key-decisions:
  - "FILTER-05 applied as style prop on the search-expand motion.div, disabling pointer events during AnimatePresence exit animation when listOpen=false"
  - "SEARCH-01 replaces ternary (cards | empty-state) with simple conditional (cards only), removing Ei tuloksia and Tyhjennä haku entirely"

patterns-established:
  - "Collapsed animated panels: combine height:0 exit with pointerEvents:none to prevent invisible touch interception"

requirements-completed:
  - FILTER-04
  - FILTER-05
  - SEARCH-01

# Metrics
duration: 15min
completed: "2026-06-03"
---

# Phase 27 Plan 03: Etusivu filter-pill background, pointer-events fix, and empty-state removal Summary

**Three surgical edits to Etusivu.tsx: rgba(0,0,0,0.04) tint on CombinedFilterPill (FILTER-04), pointer-events:none on collapsed search row during AnimatePresence exit (FILTER-05), and removal of Ei tuloksia / Tyhjennä haku empty-state UI (SEARCH-01)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-03T00:00:00Z
- **Completed:** 2026-06-03T00:15:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Added `background: 'rgba(0,0,0,0.04)'` to the outermost motion.div in CombinedFilterPill, restoring the subtle visual container that was lost when .glass was removed
- Added `pointerEvents: listOpen ? undefined : 'none'` to the search-expand motion.div so the hidden row cannot intercept map interactions during its height-0 exit animation
- Replaced the search results ternary with a simple conditional render, fully removing the "Ei tuloksia" paragraph and "Tyhjennä haku" button from the component

## Task Commits

Each task was committed atomically:

1. **Task 1: FILTER-04 — add rgba(0,0,0,0.04) background to CombinedFilterPill container** - `e96d7c0` (feat)
2. **Task 2: FILTER-05 + SEARCH-01 — pointer-events fix on collapsed search row; remove empty-state UI** - `1befbc1` (feat)

## Files Created/Modified

- `app/components/Etusivu.tsx` — Three targeted edits: background tint on pill container, pointerEvents on search-expand div, search results conditional render

## Decisions Made

- FILTER-05 was applied to the `motion.div key="search-expand"` even though it is conditionally rendered inside `{listOpen && ...}` within `AnimatePresence`. During the exit animation, `listOpen` is `false` in the parent scope, so `pointerEvents: 'none'` correctly disables touch interception during that exit phase.
- SEARCH-01 removed the entire else branch of the ternary along with the `setSearchHaku('')` / `setSearchLaji([])` / `setSearchKaupunki('Kaikki')` calls inside the deleted button. These calls were not moved elsewhere per plan specification.

## Deviations from Plan

None — plan executed exactly as written.

Note: The worktree was branched from commit 8ad0377 (Phase 24) and needed to be brought up to date with master (which included 27-01 and 27-02 merges) before executing. A fast-forward merge from the main repo was performed before any code changes. This is not a plan deviation — it is standard worktree synchronization.

## Issues Encountered

None beyond the normal worktree setup (fast-forward merge to sync with 27-01 and 27-02 results).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All three requirements (FILTER-04, FILTER-05, SEARCH-01) are complete
- Etusivu.tsx is ready for plan 27-04 (MAP-16 cluster zoom behavior fix)
- TypeScript compiles cleanly with zero errors

## Self-Check: PASSED

- Etusivu.tsx exists: FOUND
- SUMMARY.md exists: FOUND
- Commit e96d7c0 (Task 1): FOUND
- Commit 1befbc1 (Task 2): FOUND

---
*Phase: 27-siivous-pienet-korjaukset*
*Completed: 2026-06-03*
