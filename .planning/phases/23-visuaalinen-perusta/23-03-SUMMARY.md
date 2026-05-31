---
phase: 23-visuaalinen-perusta
plan: "03"
subsystem: map-pins
tags: [sport-pin, animation, svg, css, map-markers]
dependency_graph:
  requires: []
  provides: [SportPin component, spinOrbit CSS animation]
  affects: [app/components/Etusivu.tsx, app/globals.css]
tech_stack:
  added: []
  patterns: [inline-html-pin, css-keyframes-orbit, currentColor-theming]
key_files:
  created:
    - app/components/SportPin.tsx
  modified:
    - app/globals.css
decisions:
  - "SVG icon paths embedded as compile-time SPORT_ICONS constant (not imported from lib/sportPins.ts) to keep component self-contained and avoid coupling"
  - "stroke='currentColor' used in all icon paths to enable Phase 24 sport-color theming via CSS color property (D-10)"
  - "Inline styles used exclusively on pin elements (no Tailwind) to avoid purge issues inside AdvancedMarker iframe context"
  - "animDelay prop (0-1 multiplier) added for per-pin stagger; Etusivu will wire per-pin offsets in Plan 04"
metrics:
  duration: "~12 min"
  completed: "2026-06-01"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Phase 23 Plan 03: SportPin Component and Orbit Glint Summary

SportPin.tsx: blue gradient CSS pin with white circle, sport-type icons using currentColor, and continuous orbit glint animation via @keyframes spinOrbit.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add @keyframes spinOrbit and .pin-glint to globals.css | 768ece7 | app/globals.css |
| 2 | Create SportPin.tsx — inline HTML pin component | fc4d1d3 | app/components/SportPin.tsx |

## What Was Built

### Task 1 — globals.css additions

Added two new blocks to the Google Maps custom markers section of `app/globals.css`:

- `@keyframes spinOrbit` — rotates a `translateY(-13px)` offset dot 360 degrees, creating the orbit effect around the pin circle
- `.pin-glint` class — 4x4px white dot with sky-blue box-shadow, positioned absolutely at the pin center using `transform-origin: 0px 13px` so it orbits at the circle's outer edge, running spinOrbit 4s linear infinite

Both blocks added outside any `@layer` block, after existing `.pin-label` rule and before the Night page theme section.

### Task 2 — SportPin.tsx

New `'use client'` component at `app/components/SportPin.tsx`:

- Outer div: 28x38px (matches current img tag dimensions, preserves AdvancedMarker anchor geometry)
- Pin body: CSS teardrop via `borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%'` with `linear-gradient(to bottom, #38bdf8 0%, #0284c7 100%)`
- White circle: 20x20px, `borderRadius: '50%'`, positioned top:4 left:4
- Sport icon: SVG with `dangerouslySetInnerHTML` from SPORT_ICONS compile-time constant; `color: '#374151'` sets the default currentColor value; all paths use `stroke="currentColor"` for Phase 24 override compatibility
- Glint dot: `className="pin-glint"` with inline `animationDelay` from `animDelay` prop

SPORT_ICONS contains all 7 sport types (padel, kuntosali, jooga, uinti, tennis, liikuntahalli, liikunta) plus a fallback circle, copied from lib/sportPins.ts with stroke="currentColor" substitution applied.

## Deviations from Plan

None — plan executed exactly as written. The only clarification was that `stroke="#374151"` appears in a code comment (explaining what was replaced) but not in any actual SVG path string — this is correct and intentional.

## Known Stubs

None — SportPin is a complete, self-contained component. It is not yet wired into Etusivu (Plan 04 handles that integration).

## Threat Flags

None — no new network endpoints, auth paths, or file access patterns introduced. The dangerouslySetInnerHTML usage is bounded to a compile-time constant (T-23-03-01: accepted per threat model).

## Self-Check: PASSED

- [x] app/globals.css contains @keyframes spinOrbit and .pin-glint: FOUND
- [x] app/components/SportPin.tsx created: FOUND
- [x] No import from lib/sportPins in SportPin.tsx: CONFIRMED (only a comment referencing the source)
- [x] Commit 768ece7 (globals.css): FOUND
- [x] Commit fc4d1d3 (SportPin.tsx): FOUND
