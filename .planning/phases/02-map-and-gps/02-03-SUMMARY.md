---
phase: 02-map-and-gps
plan: "03"
subsystem: map-and-gps
tags: [map, gps, distance, migration, vis-gl]
dependency_graph:
  requires:
    - 02-02
  provides:
    - MAP-02
    - MAP-03
  affects:
    - app/components/Etusivu.tsx
    - app/components/PaikkaKortti.tsx
    - app/components/LiikuntapaikatLista.tsx
    - app/components/Kartta.tsx
tech_stack:
  added: []
  removed:
    - "@react-google-maps/api"
  patterns:
    - AdvancedMarker with custom SVG SimplePin for Etusivu maps
    - MapStyleController child component pattern (same as Kartta.tsx)
    - useMemo-based distancesMap keyed by venue ID
    - GPS button as pill in filter row
key_files:
  created: []
  modified:
    - app/components/Etusivu.tsx
    - app/components/PaikkaKortti.tsx
    - app/components/LiikuntapaikatLista.tsx
    - app/components/Kartta.tsx
    - package.json
    - package-lock.json
decisions:
  - "Used SimplePin (plain SVG, no animations) for Etusivu maps — decorative context does not need Framer Motion per plan spec"
  - "Removed onAnimationComplete callback and window.google.maps.event.trigger — @vis.gl handles resize automatically"
  - "GPS button placed inside the sport filter pills scrollable row as a sibling pill, consistent with existing UI patterns"
  - "distancesMap keyed by venue id (string) using useMemo with [coords, paikat] dependencies — recomputes only when GPS changes"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-20T23:48:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 6
---

# Phase 2 Plan 03: Map Migration + Distance Strings Summary

**One-liner:** Migrated Etusivu.tsx's two Google Maps instances to @vis.gl/react-google-maps with SimplePin markers, removed @react-google-maps/api entirely, and wired GPS distance strings into PaikkaKortti (list view) and Kartta (map bottom sheet).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrate Etusivu.tsx to @vis.gl and remove @react-google-maps/api | 85fa48a | Etusivu.tsx, package.json, package-lock.json |
| 2 | Add distance string to PaikkaKortti and wire GPS into LiikuntapaikatLista | 85fa48a | PaikkaKortti.tsx, LiikuntapaikatLista.tsx, Kartta.tsx |

## What Was Built

**Task 1 — Etusivu migration:**
- Removed `GoogleMap`, `Marker`, `useJsApiLoader` from `@react-google-maps/api`
- Replaced with `Map`, `AdvancedMarker` from `@vis.gl/react-google-maps`
- Added `MapStyleController` helper (same pattern as Kartta.tsx) to handle day/night styles reactively
- Added `SimplePin` helper — lightweight SVG pin with sport color, no animations
- Removed `mapInstanceRef`, `previewMapRef`, `onFullscreenMapLoad`, `onPreviewMapLoad` refs/callbacks
- Removed `getMarkerIcon()` function and `ICON_SVG` constant (no longer needed)
- Removed `isDark` useEffect that manually called `mapInstanceRef/previewMapRef.setOptions` (MapStyleController handles this)
- Removed `onAnimationComplete` callback and `window.google.maps.event.trigger` resize call
- Removed `isLoaded` guard — Map component renders an empty div when not ready
- Ran `npm uninstall @react-google-maps/api` — package fully removed

**Task 2 — Distance strings:**
- Added `distanceStr?: string` optional prop to `PaikkaKortti`
- Wrapped price/placeholder in `flex flex-col items-end` div with distance below when present
- Added `useGPS`, `haversineKm`, `formatDistance` imports to `LiikuntapaikatLista`
- Added `distancesMap` useMemo keyed by venue ID, recomputes on GPS coords change
- Added GPS button (motion.button) as pill in sport filter row with three states: idle, requesting, granted
- Updated PaikkaKortti rendering in lista to pass computed `distanceStr`
- Added `haversineKm`/`formatDistance` imports to `Kartta.tsx`
- Added distance line to Kartta bottom sheet below address — shown only when `coords` is available

## Verification Results

- `npx tsc --noEmit` — exits 0 (no TypeScript errors)
- `grep -r "@react-google-maps" app/ lib/ hooks/` — 0 results
- `grep -r "useJsApiLoader" app/` — 0 results
- `grep "distanceStr" app/components/PaikkaKortti.tsx` — match found
- `grep "distancesMap" app/components/LiikuntapaikatLista.tsx` — match found
- `grep "haversineKm" app/components/Kartta.tsx` — match found

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data flows are wired. Distance shows only when GPS is granted (non-null coords), which is correct behavior.

## Threat Flags

No new security-relevant surface introduced. GPS coords remain in component state only, never serialized or transmitted. GPS is triggered exclusively via button onClick, not auto-requested on mount (T-02-09 mitigated).

## Self-Check: PASSED

- `app/components/Etusivu.tsx` — exists, contains `AdvancedMarker`, no `@react-google-maps` imports
- `app/components/PaikkaKortti.tsx` — exists, contains `distanceStr`
- `app/components/LiikuntapaikatLista.tsx` — exists, contains `distancesMap`
- `app/components/Kartta.tsx` — exists, contains `haversineKm`
- Commit `85fa48a` — verified in git log
