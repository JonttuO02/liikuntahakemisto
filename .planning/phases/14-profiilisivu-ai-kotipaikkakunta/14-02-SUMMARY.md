---
phase: 14-profiilisivu-ai-kotipaikkakunta
plan: "02"
subsystem: ui
tags: [navigation, navpill, etusivu, profiili, glassmorphism]

# Dependency graph
requires: []
provides:
  - Profiili link in NavPill expanded menu (href=/profiili, User icon, above Suosikit)
  - Profiili link in Etusivu inline expanding pill (href=/profiili, User icon, above Suosikit)
affects: [14-03, 14-04, 14-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Profiili link placed above Suosikit in both nav components — D-09/D-10 ordering convention"

key-files:
  created: []
  modified:
    - app/components/NavPill.tsx
    - app/components/Etusivu.tsx

key-decisions:
  - "Profiili link visible to all users regardless of auth state (D-09) — consistent with /suosikit pattern"
  - "No new imports needed — User icon already imported in both files"

patterns-established:
  - "Nav link insertion: use existing BTN className constant in NavPill; inline class string in Etusivu pill"

requirements-completed: [AUTH-04]

# Metrics
duration: 5min
completed: 2026-05-28
---

# Phase 14 Plan 02: Profiili Nav Links Summary

**Profiili link (User icon, href=/profiili) added above Suosikit in both NavPill expanded menu and Etusivu inline expanding pill**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-28T09:02:00Z
- **Completed:** 2026-05-28T09:03:28Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- NavPill.tsx expanded menu now shows Profiili link above Suosikit, with User icon and onClick close behavior
- Etusivu.tsx inline pill expanded menu now shows Profiili link above Suosikit, with User icon and closeOverlays behavior
- No new imports required in either file — User icon was already imported
- Zero TypeScript errors introduced

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Profiili link to NavPill.tsx** - `48b67bd` (feat)
2. **Task 2: Add Profiili link to Etusivu.tsx inline pill** - `c0b9ca2` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `app/components/NavPill.tsx` - Added Profiili Link before Suosikit link in expanded pill content
- `app/components/Etusivu.tsx` - Added Profiili Link before Suosikit link in inline expanding pill

## Decisions Made
- None - followed plan as specified

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Nav links to /profiili are live in both pill components
- Profile page (14-03) and database (14-04) can proceed in parallel waves
- Both nav entry points are wired and ready

---
*Phase: 14-profiilisivu-ai-kotipaikkakunta*
*Completed: 2026-05-28*
