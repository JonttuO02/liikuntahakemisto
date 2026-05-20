---
phase: 02-map-and-gps
plan: 02
subsystem: map
tags: [vis.gl, google-maps, gps, advanced-marker]
dependency_graph:
  requires: [02-01]
  provides: [map-component-vis.gl]
  affects: [app/components/Kartta.tsx]
tech_stack:
  added: []
  patterns: [AdvancedMarker, MapPanController, MapStyleController, useGPS]
key_files:
  modified:
    - app/components/Kartta.tsx
decisions:
  - "Use MapPanController child component to pan map to GPS coords rather than controlled center prop — avoids re-panning on every re-render"
  - "GPS status 'requesting' shows a subtle pill; denied/unavailable/timeout shows a retry button; granted is silent"
  - "Map container height changed from h-[520px] fixed to h-[calc(100svh-56px)] to fill screen below NavBar"
metrics:
  duration: "8 minutes"
  completed: "2026-05-21"
  tasks_completed: 1
  files_modified: 1
---

# Phase 02 Plan 02: Kartta.tsx @vis.gl Rewrite Summary

**One-liner:** Rewrote Kartta.tsx from @react-google-maps/api to @vis.gl/react-google-maps with AdvancedMarker pins and auto-GPS via useGPS() hook.

## What Was Done

Kartta.tsx was completely rewritten to replace the deprecated `@react-google-maps/api` library with `@vis.gl/react-google-maps`. Key changes:

1. **Imports replaced:** Removed `GoogleMap`, `OverlayView`, `useJsApiLoader` from `@react-google-maps/api`. Added `Map`, `AdvancedMarker`, `useMap` from `@vis.gl/react-google-maps`, plus `useGPS` from `@/hooks/useGPS`.

2. **SportPin simplified:** Removed the `OverlayView` JSX wrapper and `PIN_OFFSET` constant. The component now returns the `motion.div` directly — it becomes the child of `AdvancedMarker` which handles positioning.

3. **Two new helper components added:**
   - `MapStyleController` — uses `useMap()` to apply day/night styles via `map.setOptions()` whenever `isDark` changes
   - `MapPanController` — uses `useMap()` to call `map.panTo(coords)` when GPS resolves, rendered as a child of `<Map>` so it has access to the map instance

4. **Auto-GPS on mount:** `useGPS()` is called in the Kartta component. The hook auto-requests GPS on its own `useEffect` — no manual trigger needed in Kartta. Once coords resolve, `MapPanController` pans the map without resetting other user interactions.

5. **Loading state removed:** The `useJsApiLoader` `isLoaded` guard and "Ladataan karttaa..." fallback were removed. `APIProvider` in `layout.tsx` ensures the Maps API is ready before Map mounts.

6. **GPS status UI added:** A "Haetaan sijaintia..." pill shows during `requesting` status. A "Hae sijainti uudelleen" retry button appears for `denied`/`unavailable`/`timeout` states. Granted state is silent.

7. **Map height updated:** Changed from `h-[520px]` to `h-[calc(100svh-56px)]` to fill the viewport below the 56px NavBar.

8. **Day/night toggle and bottom sheet:** Kept exactly as in the original — no changes to those sections.

## TypeScript Issues Encountered

None. TypeScript check (`npx tsc --noEmit`) passed on the first attempt with zero errors.

## TypeScript Final Status

PASSED — 0 errors, 0 warnings.

## Deviations from Plan

None — plan executed exactly as written. The optional GPS status UI was included as it was straightforward to implement cleanly alongside the main changes.

## Self-Check: PASSED

- app/components/Kartta.tsx: exists and contains AdvancedMarker, useGPS, MapPanController
- No @react-google-maps/api imports remain
- Commit 0992e68 recorded

## Threat Flags

None — GPS coords remain in useState only, never passed to any API route, URL, or console.log (T-02-05 mitigated as planned).
