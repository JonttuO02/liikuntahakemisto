# Phase 2 Context — Map & GPS

**Phase:** 2 — Map & GPS
**Derived from:** ROADMAP.md + REQUIREMENTS.md (no separate discuss-phase run)
**Date:** 2026-05-20

## Goal

Users can find venues near their physical location on an interactive map that works without visual glitches.

## Requirements

- **MAP-01**: User can request their location and see nearby venues on the map; if permission denied, Tampere center is the silent default
- **MAP-02**: Every venue card shows distance from user ("1,2 km")
- **MAP-03**: Map component uses `@vis.gl/react-google-maps` (AdvancedMarker, no double-load flash)

## Success Criteria

1. Tapping "Käytä sijaintiani" on mobile triggers the browser location prompt; after granting permission the map centers on the user's position and shows nearby venue pins
2. If location permission is denied or unavailable, the map silently centers on Tampere city center — no error message, no broken state
3. Every venue card in list and map view shows a distance string ("1,2 km") that updates when the user's location changes
4. The map renders without the double-load flash that occurred with the previous library — pins appear in a single paint cycle

## Key Constraints (from CLAUDE.md)

- GPS: **client-side only, never URL params, never auto-request on mount**
- URL routing: always use `?nakyma=kartta`
- Map component is lazy-loaded: `const Kartta = lazy(() => import('./Kartta'))`
- Animations follow Emil Kowalski principles (fast, purposeful, no decoration)

## Current Codebase State

- `@react-google-maps/api` v2.20.8 — must migrate to `@vis.gl/react-google-maps`
- Two competing map implementations: `Etusivu.tsx` (integrated, 526 lines) vs `Kartta.tsx` (standalone, dead code, 282 lines)
- `Kartta.tsx` is currently unreachable — `/?nakyma=kartta` renders `Etusivu`, not `Kartta.tsx`
- `TAMPERE` constant duplicated in 4 files — should move to `lib/constants.ts`
- No `useGPS` hook exists yet
- No `haversineKm()` distance utility exists yet

## Phase Mode

mvp — vertical slices (UI → API → state management)
