# Phase 2 UAT — Map & GPS

**Phase:** 2 — Map & GPS
**Started:** 2026-05-21
**Tester:** Joona Orava

## Success Criteria

1. GPS auto-requests on app open; map centers on user's position with nearby venue pins
2. If GPS denied or unavailable, map silently uses Tampere city center — no error message, no broken state
3. Every venue card in list and map view shows a distance string ("1,2 km") when GPS is active
4. The map renders without double-load flash — pins appear in a single paint cycle (no blank-then-render)

## Test Results

| # | Test | Result | Notes |
|---|------|--------|-------|
| 1 | GPS auto-requests on page open | - | |
| 2 | Tampere fallback when GPS denied | - | |
| 3 | Distance strings on list-view cards | - | |
| 4 | Distance in map bottom sheet | - | |
| 5 | No double-load flash on map render | - | |
| 6 | Map pins render with sport colors | - | |
| 7 | Day/night map theme toggle | - | |

## Issues Found

(none yet)

## Outcome

PENDING
