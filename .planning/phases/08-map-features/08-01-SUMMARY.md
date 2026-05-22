---
phase: 08-map-features
plan: "01"
subsystem: map
tags: [gps-ring, framer-motion, zoom-tracking, onCameraChanged, AdvancedMarker]
dependency_graph:
  requires: [07-02]
  provides: [GPS-accuracy-ring, zoomLevel-state, onCameraChanged-wiring]
  affects: [app/components/Etusivu.tsx]
tech_stack:
  added: []
  patterns: [motion.div-ripple-ring, onCameraChanged-zoom-tracking]
key_files:
  created: []
  modified:
    - app/components/Etusivu.tsx
decisions:
  - "White ripple ring added as motion.div first child inside both user-location AdvancedMarker divs — preview and fullscreen maps both get the animation"
  - "overflow: 'visible' added to outer div so ring (inset: -8, extends 8px outward) is not clipped"
  - "zoomLevel state initialized at 14 matching defaultZoom — reactive via onCameraChanged on fullscreen Map only"
  - "Preview map (gestureHandling=none) intentionally excluded from onCameraChanged — zoom logic only applies to interactive fullscreen map"
metrics:
  duration: "5 minutes"
  completed: "2026-05-22"
  tasks_completed: 2
  files_modified: 1
  files_created: 0
---

# Phase 08 Plan 01: GPS Ring + Zoom State Summary

White ripple ring animation on user location AdvancedMarker (both map instances) via Framer Motion, plus reactive zoomLevel state wired to fullscreen Map's onCameraChanged for Plan 08-02 consumption.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add white ripple ring to user location AdvancedMarker (both map instances) | 2901e32 | app/components/Etusivu.tsx |
| 2 | Add zoomLevel state and onCameraChanged to fullscreen Map | 2f19f2e | app/components/Etusivu.tsx |

## What Was Built

**Task 1 — GPS accuracy ripple ring:**
- Added a `motion.div` as the first child inside both user-location AdvancedMarker container divs (preview map at ~line 280, fullscreen map at ~line 345).
- Ring style: `position: 'absolute', inset: -8, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.7)', pointerEvents: 'none'`.
- Animation: `animate={{ scale: [0.5, 2], opacity: [0.6, 0] }}` with `transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}`.
- Both outer container divs updated with `overflow: 'visible'` so the ring (which extends 8px outside via `inset: -8`) is not clipped.
- No new imports needed — `motion` was already imported from framer-motion.

**Task 2 — Zoom tracking state:**
- Added `const [zoomLevel, setZoomLevel] = useState(14)` alongside other state declarations.
- Added `onCameraChanged={(ev) => setZoomLevel(ev.detail.zoom)}` to the fullscreen Map component (gestureHandling="greedy") only.
- Preview map (gestureHandling="none") intentionally unchanged — zoom logic applies only to interactive map.
- `zoomLevel` state is available as a reactive number in Etusivu for downstream use by Plan 08-02 (pin→mini-card transformation at zoom threshold 16).

## Deviations from Plan

### Baseline correction (handled automatically)

The worktree was branched from commit `4a2b1bd` (pre-Phase-7), while master had advanced through Phase 7's AdvancedMarker migration. The worktree's `Etusivu.tsx` still used the legacy `Marker` API with `userLocationPinUrl()` SVG icons.

**Resolution:** Applied `git show master:app/components/Etusivu.tsx` to update the worktree file to the correct Phase 7 baseline before implementing Phase 8 changes. This brought in:
- `AdvancedMarker` in place of `Marker`
- Inline HTML div user-location marker (blue dot)
- `RecenterButton` component
- `mapId + colorScheme` day/night switching
- `useGPS({ autoRequest: true })`
- `isSafeUrl()` import and usage

This is the correct foundation the plan was written for. The Phase 8 changes were then applied on top of this baseline.

## Acceptance Criteria Check

- [x] Both user-location AdvancedMarker divs contain a `motion.div` ring child
- [x] Ring has `animate={{ scale: [0.5, 2], opacity: [0.6, 0] }}` and `transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}`
- [x] Ring has `inset: -8` and `border: '2px solid rgba(255,255,255,0.7)'`
- [x] Both outer container divs have `overflow: 'visible'`
- [x] `const [zoomLevel, setZoomLevel] = useState(14)` exists in state declarations
- [x] Fullscreen Map (gestureHandling="greedy") has `onCameraChanged={(ev) => setZoomLevel(ev.detail.zoom)}`
- [x] Preview Map (gestureHandling="none") does NOT have onCameraChanged
- [x] TypeScript compiles without errors (`npx tsc --noEmit` exits 0)

## Threat Flags

No new security surface introduced. Map zoom events come from Google Maps JS API (trusted first-party). `setZoomLevel` is a pure React state setter — no external data flows through it. (T-08-01: accepted per plan threat model.)

## Self-Check: PASSED

- [x] `app/components/Etusivu.tsx` — modified and committed (2901e32, 2f19f2e)
- [x] Commit 2901e32 exists (feat: GPS ripple ring)
- [x] Commit 2f19f2e exists (feat: zoomLevel state)
- [x] `grep -c "scale: \[0.5, 2\]" app/components/Etusivu.tsx` = 2
- [x] `grep -c "onCameraChanged" app/components/Etusivu.tsx` = 1
- [x] `grep -c "zoomLevel\|setZoomLevel" app/components/Etusivu.tsx` = 2
- [x] TypeScript build: PASSED
