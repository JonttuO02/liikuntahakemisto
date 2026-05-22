---
phase: 07-map-infrastructure
plan: "02"
subsystem: map
tags: [recenter-button, useMap, lucide, MAP-04, glassmorphism]
dependency_graph:
  requires: [07-01]
  provides: [RecenterButton, MAP-04]
  affects: [app/components/Etusivu.tsx]
tech_stack:
  added: []
  patterns: [useMap-inner-component, glass-btn-floating-button]
key_files:
  created: []
  modified:
    - app/components/Etusivu.tsx
decisions:
  - "RecenterButton implements same useMap() pattern as MapPanController — same file, same hook, different behavior"
  - "glass-btn rounded-full w-10 h-10 matches X close button and day/night toggle for visual consistency"
  - "bottom-16 right-4 positions button above filter pills row at bottom-4"
  - "Silent no-op when coords is null — no toast, no error, as per D-12"
metrics:
  duration: "2 minutes"
  completed: "2026-05-22"
  tasks_completed: 1
  files_modified: 1
  files_created: 0
---

# Phase 07 Plan 02: Re-center Button (MAP-04) Summary

Floating re-center button added to fullscreen map using `useMap()` + `map.panTo(coords)` — gives users a manual way to return to their GPS position after panning away.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add RecenterButton inner component and render it in the fullscreen map | 0157e8d | app/components/Etusivu.tsx |

## What Was Built

`RecenterButton` inner component added to `app/components/Etusivu.tsx`:

- **Component pattern:** Same `useMap()` hook pattern as the existing `MapPanController` function. `RecenterButton` is a React function component that calls `map.panTo(coords)` imperatively on button tap.
- **Positioning:** `absolute bottom-16 right-4 z-10` — bottom-right corner of the fullscreen map, positioned above the filter pills row (`bottom-4` + ~40px pill height).
- **Styling:** `glass-btn rounded-full w-10 h-10 flex items-center justify-center` — identical to X close button and day/night toggle for visual consistency. Text color `rgba(17,17,17,0.6)` → `#111111` on hover, with `[transition:color_150ms_var(--ease-out)]`.
- **Icon:** `<Locate className="w-4 h-4" />` from `lucide-react` (added to existing import line).
- **Accessibility:** `aria-label="Palaa omalle sijainnille"`.
- **Animation:** `whileTap={{ scale: 0.95 }}` via Framer Motion `motion.button` — matches filter pill tap pattern.
- **Null safety:** `onClick={() => { if (map && coords) map.panTo(coords) }}` — silent no-op when GPS is unavailable (coords is null). No visual feedback for the null case, per D-12.
- **Scope:** Rendered only inside the fullscreen map's inner `motion.div` (line 356). Not present in the 3D preview map block. `MapPanController` is kept unchanged alongside it — they serve different triggers (auto-pan on GPS resolution vs. manual re-center).

## Deviations from Plan

None — plan executed exactly as written.

## Acceptance Criteria Check

- [x] Etusivu.tsx imports `Locate` from lucide-react
- [x] Etusivu.tsx contains a `RecenterButton` function component definition
- [x] RecenterButton contains `map.panTo(coords)` inside an onClick handler
- [x] RecenterButton contains `aria-label="Palaa omalle sijainnille"`
- [x] RecenterButton contains `className` with `glass-btn`, `rounded-full`, `w-10`, `h-10`, `bottom-16`, `right-4`
- [x] RecenterButton contains `whileTap={{ scale: 0.95 }}`
- [x] `<RecenterButton coords={coords} />` appears only once in the JSX (inside the fullscreen map wrapper)
- [x] `<RecenterButton` does NOT appear inside the preview map AnimatePresence block
- [x] `npm run build` exits 0

## Threat Flags

No new security surface introduced. `map.panTo(coords)` only moves the viewport — no data mutation. GPS coords originate from the browser Geolocation API, not user-supplied input. (T-07-03: accepted per plan threat model.)

## Self-Check: PASSED

- [x] `app/components/Etusivu.tsx` — modified and committed (0157e8d)
- [x] Commit 0157e8d exists: `git log --oneline | grep 0157e8d` confirms
- [x] `RecenterButton` function present at line 53
- [x] `<RecenterButton coords={coords} />` render site at line 356 (fullscreen map only)
- [x] Build exits 0
