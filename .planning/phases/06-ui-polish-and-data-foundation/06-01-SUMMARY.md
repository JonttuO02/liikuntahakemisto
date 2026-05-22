---
phase: 06-ui-polish-and-data-foundation
plan: 01
subsystem: database
tags: [supabase, next.js, select-query, featured, ads]

# Dependency graph
requires: []
provides:
  - "featured boolean column available on client via Supabase SELECT"
  - "ADS-02 (Sponsoroitu badge) unblocked for Wave 2"
affects:
  - "06-02 (PaikkaKortti badge)"
  - "06-05 (Etusivu bottom-sheet badge)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Explicit column list in Supabase SELECT — never use select('*')"

key-files:
  created: []
  modified:
    - "app/page.tsx"

key-decisions:
  - "Keep explicit SELECT column list (not select('*')) — append featured as 15th column"

patterns-established:
  - "Pattern D-09: Always extend explicit SELECT lists rather than switching to wildcard"

requirements-completed:
  - ADS-02

# Metrics
duration: 8min
completed: 2026-05-22
---

# Phase 6 Plan 01: Add featured Column to SELECT Query — Summary

**`featured` boolean column now included in Supabase SELECT so paikka.featured is boolean | null on the client, unblocking the Sponsoroitu badge (ADS-02) in Wave 2**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-22T06:14:00Z
- **Completed:** 2026-05-22T06:22:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added `featured` to the explicit 15-column SELECT string in `app/page.tsx`
- TypeScript strict-mode compile (`npx tsc --noEmit`) passes with no errors
- Vitest suite (11 tests) remains green

## Task Commits

Each task was committed atomically:

1. **Task 1: Add featured column to SELECT in app/page.tsx** - `ed528d3` (feat)

**Plan metadata:** committed with SUMMARY.md

## Files Created/Modified

- `app/page.tsx` - Appended `, featured` to the `.select(...)` argument string; 15 columns total

## Decisions Made

Keep the explicit column list rather than switching to `select('*')`. Rationale: explicit lists make the data contract visible in code, prevent accidental exposure of future columns, and are the established project convention (per D-09 in RESEARCH.md).

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

Minor path issue: initial Edit targeted the main repo `app/page.tsx` instead of the worktree copy. Detected immediately, reverted main repo file, applied edit to correct worktree path. No functional impact.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `paikka.featured` is now a boolean on the client for all components downstream of `app/page.tsx`
- Wave 2 plans (06-02 PaikkaKortti, 06-05 Etusivu bottom-sheet) can now conditionally render the "Sponsoroitu" badge without any additional data plumbing

---
## Self-Check: PASSED

- FOUND: app/page.tsx (modified with featured column)
- FOUND: 06-01-SUMMARY.md (this file)
- FOUND commit: ed528d3 (feat task commit)

---
*Phase: 06-ui-polish-and-data-foundation*
*Completed: 2026-05-22*
