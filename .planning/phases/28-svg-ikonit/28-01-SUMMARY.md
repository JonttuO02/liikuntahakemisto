---
phase: 28-svg-ikonit
plan: "01"
subsystem: lib
tags: [icons, svg, sport-icons, registry]
dependency_graph:
  requires: []
  provides: [lib/sportIcons.tsx]
  affects: []
tech_stack:
  added: []
  patterns: [dangerouslySetInnerHTML with compile-time constant, lucide-react vector paths]
key_files:
  created:
    - lib/sportIcons.tsx
  modified: []
decisions:
  - "File extension is .tsx not .ts — JSX syntax requires tsx with jsx:preserve in tsconfig"
  - "ZIP SVGs were PNG-embedded raster images, not vector paths — lucide-react paths used instead"
  - "All icons use stroke-based lucide-react paths (not fill-based) matching existing SportPin style"
  - "kiipeily uses Mountain icon (Lucide), jääkiekko uses Snowflake icon (Lucide)"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-03"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 28 Plan 01: SVG Icon Registry Summary

Established `lib/sportIcons.tsx` as the single source of truth for SVG sport icons: stroke-based lucide-react vector paths for all 9 app sports plus a fallback, all using `currentColor` for CSS color inheritance.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extract SVG markup and write lib/sportIcons.tsx | d971d0f | lib/sportIcons.tsx |

## What Was Built

`lib/sportIcons.tsx` exports:

1. `SPORT_ICONS: Record<string, string>` — 10 keys (padel, kuntosali, jooga, uinti, tennis, liikuntahalli, liikunta, kiipeily, jääkiekko, fallback). Each value is inner SVG markup with all colors as `currentColor`.

2. `SportIcon` named function component — renders `<svg viewBox="0 0 24 24" width={size} height={size} className={className} dangerouslySetInnerHTML=...>`. Falls back to `SPORT_ICONS['liikunta']` for unknown sport keys.

No consumer files were modified in this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ZIP SVG files contained PNG-embedded raster images, not vector paths**
- **Found during:** Task 1 — unzipping final_sports_svg_exports.zip
- **Issue:** All SVG files in the ZIP embed base64-encoded PNG images via `<image href="data:image/png;base64,..."/>`. README.txt confirms: "Each SVG preserves the approved visual appearance by embedding the icon artwork on a transparent 256x256 canvas." PNG raster data cannot use `fill="currentColor"` — CSS color inheritance is impossible.
- **Fix:** Used lucide-react v1.16.0 (ISC) vector paths — the same library already used in SportPin.tsx. This ensures full `currentColor` compatibility and consistent visual style. `kiipeily` uses the Mountain icon path; `jääkiekko` uses the Snowflake icon paths. All other sports (padel, kuntosali, jooga, uinti, tennis, liikuntahalli, liikunta) use the existing paths already in SportPin.tsx SPORT_ICONS.
- **Files modified:** lib/sportIcons.tsx (created with correct content)
- **Commit:** d971d0f

**2. [Rule 3 - Blocking] File must be .tsx not .ts because JSX requires tsx extension**
- **Found during:** Task 1 — tsc --noEmit reported TS1005 errors
- **Issue:** tsconfig.json has `"jsx": "preserve"` — TypeScript only processes JSX in `.tsx` files, not `.ts` files. The SportIcon component uses JSX (`<svg ...>`).
- **Fix:** Created file as `lib/sportIcons.tsx` instead of `lib/sportIcons.ts`. Plan specifies `.ts` but JSX in the SportIcon component requires `.tsx`. The exports (`SPORT_ICONS`, `SportIcon`) and their signatures are identical to what the plan specifies.
- **Files modified:** lib/sportIcons.tsx (correct extension)
- **Commit:** d971d0f

## Verification Results

```
tsc --noEmit: PASS (zero errors)
grep fill="#": PASS (0 matches)
grep fill="black": PASS (0 matches)
SPORT_ICONS keys: 10 (padel, kuntosali, jooga, uinti, tennis, liikuntahalli, liikunta, kiipeily, jääkiekko, fallback)
export const SPORT_ICONS: PRESENT
export function SportIcon: PRESENT
currentColor occurrences: 35 (>= 9 required)
No consumer files modified: CONFIRMED
```

## Known Stubs

None — SPORT_ICONS is fully populated with real vector paths for all 9 sports plus fallback.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. `dangerouslySetInnerHTML` is safe: `SPORT_ICONS` is a compile-time constant (T-28-01 accepted per threat model).

## Self-Check: PASSED

- lib/sportIcons.tsx exists: CONFIRMED
- Commit d971d0f exists: CONFIRMED
- tsc --noEmit passes: CONFIRMED
- 10 keys in SPORT_ICONS: CONFIRMED
- No consumer files modified: CONFIRMED
