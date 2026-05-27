---
phase: 10-city-expansion
plan: "01"
subsystem: lib
tags: [geo, constants, city-expansion, utilities]
dependency_graph:
  requires: []
  provides:
    - SUOMI_KAUPUNGIT array (lib/constants.ts)
    - nearestKaupunki function (lib/geo.ts)
  affects:
    - lib/geo.ts
    - lib/constants.ts
tech_stack:
  added: []
  patterns:
    - haversine distance for nearest-city lookup
    - typed const array with inline type annotation
key_files:
  created:
    - lib/constants.test.ts
    - lib/geo.test.ts
  modified:
    - lib/constants.ts
    - lib/geo.ts
decisions:
  - SUOMI_KAUPUNGIT uses inline type annotation (no interface) per plan spec
  - nearestKaupunki imports SUOMI_KAUPUNGIT via relative ./constants path (no @/ alias — lib/ files use relative imports)
  - TDD with vitest: RED commits before GREEN commits for both tasks
metrics:
  duration: "3m"
  completed: "2026-05-27T08:06:39Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 4
---

# Phase 10 Plan 01: City constants and geo utility — Summary

SUOMI_KAUPUNGIT 25-city typed array added to lib/constants.ts and nearestKaupunki haversine-based nearest-city function added to lib/geo.ts.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 (RED) | Failing tests for SUOMI_KAUPUNGIT | 734896e | lib/constants.test.ts |
| 1 (GREEN) | SUOMI_KAUPUNGIT implementation | 0ab4483 | lib/constants.ts |
| 2 (RED) | Failing tests for nearestKaupunki | 9aa81dc | lib/geo.test.ts |
| 2 (GREEN) | nearestKaupunki implementation | d5ff5e0 | lib/geo.ts |

## What Was Built

### lib/constants.ts
- Added `SUOMI_KAUPUNGIT: { nimi: string; lat: number; lng: number }[]` with 25 cities
- Helsinki first, Kouvola last, order per CONTEXT.md D-06
- Tampere entry lat/lng matches existing `TAMPERE` constant exactly
- `TAMPERE` export preserved unchanged

### lib/geo.ts
- Added `import { SUOMI_KAUPUNGIT } from './constants'` at top
- Added `nearestKaupunki(lat: number, lng: number): string` at end
- Iterates SUOMI_KAUPUNGIT using existing `haversineKm`, returns `nimi` of nearest city
- Implementation follows CONTEXT.md D-07 snippet verbatim

## Test Results

- 43/43 tests pass across all lib test files
- TypeScript: zero errors (`npx tsc --noEmit` clean)
- Spot-checks: Tampere (61.4978, 23.761) → 'Tampere', Helsinki (60.1699, 24.9384) → 'Helsinki', Turku (60.4518, 22.2666) → 'Turku'

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Accidental commit to master branch**
- **Found during:** Task 1 TDD RED phase
- **Issue:** First git add/commit ran with `cd /c/ClaudeCodeTestit/liikuntahakemisto` (main repo path) instead of the worktree path, causing the test file to be committed to `master` instead of the worktree branch.
- **Fix:** Ran `git reset HEAD~1` (soft) on master to undo the commit, deleted the misplaced file from the main repo, recreated the file in the worktree path, committed from the worktree.
- **Files affected:** lib/constants.test.ts (now correctly in worktree only)
- **Outcome:** Master restored to pre-plan state; worktree branch has all 4 plan commits

## TDD Gate Compliance

- RED gate: `test(10-01): add failing tests for SUOMI_KAUPUNGIT` (734896e) — tests failed before implementation
- GREEN gate: `feat(10-01): add SUOMI_KAUPUNGIT 25-city array to lib/constants.ts` (0ab4483)
- RED gate: `test(10-01): add failing tests for nearestKaupunki` (9aa81dc) — tests failed before implementation
- GREEN gate: `feat(10-01): add nearestKaupunki to lib/geo.ts` (d5ff5e0)
- Both RED/GREEN gate sequences present and correctly ordered

## Known Stubs

None — both exports are fully implemented with real data and logic.

## Threat Flags

None — lib/ utilities are pure in-process computation with no network I/O, no auth boundaries, no new trust surfaces introduced.

## Self-Check: PASSED

- lib/constants.ts: FOUND
- lib/geo.ts: FOUND
- lib/constants.test.ts: FOUND
- lib/geo.test.ts: FOUND
- SUMMARY.md: FOUND
- Commit 734896e (test RED SUOMI_KAUPUNGIT): FOUND
- Commit 0ab4483 (feat SUOMI_KAUPUNGIT): FOUND
- Commit 9aa81dc (test RED nearestKaupunki): FOUND
- Commit d5ff5e0 (feat nearestKaupunki): FOUND
