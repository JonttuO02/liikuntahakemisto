---
phase: 07-map-infrastructure
plan: "01"
subsystem: map
tags: [advancedmarker, google-maps, migration, env-vars]
dependency_graph:
  requires: []
  provides: [AdvancedMarker-foundation, mapId-env-switching]
  affects: [app/components/Etusivu.tsx, lib/mapStyles.ts, lib/sportPins.ts]
tech_stack:
  added: []
  patterns: [AdvancedMarker-with-img-child, mapId-day-night-switching]
key_files:
  created: [.env.local.example]
  modified:
    - app/components/Etusivu.tsx
    - lib/mapStyles.ts
    - lib/sportPins.ts
    - app/components/LiikuntapaikatLista.tsx
decisions:
  - "AdvancedMarker children-based pin model (img child) preserves pinUrl SVG output unchanged"
  - "MapStyleController removed entirely — day/night styles baked into Cloud Console Map IDs"
  - "userLocationPinUrl() deleted from sportPins.ts — replaced by inline HTML div"
  - "DAY_MAP_STYLES/NIGHT_MAP_STYLES constants deleted from mapStyles.ts; isNightHour kept"
metrics:
  duration: "5 minutes"
  completed: "2026-05-22"
  tasks_completed: 2
  files_modified: 4
  files_created: 1
---

# Phase 07 Plan 01: AdvancedMarker Migration and mapId Switching Summary

AdvancedMarker migration from legacy Marker API: venue pins via `<img>` child with gmap-pin CSS class, user location via inline HTML div (Google blue dot), plus day/night mapId env var switching replacing MapStyleController.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Migrate venue and user-location Markers to AdvancedMarker | 13021d4 | Etusivu.tsx, sportPins.ts, LiikuntapaikatLista.tsx |
| 2 | Add day/night mapId switching and remove MapStyleController | 2e73e47 | Etusivu.tsx, mapStyles.ts, .env.local.example |

## What Was Built

Both map instances in `Etusivu.tsx` (3D preview + fullscreen) migrated from the legacy `Marker` component to `AdvancedMarker`:

- **Venue pins:** `<AdvancedMarker>` wrapping `<img src={pinUrl(color, laji)} width={28} height={38} className="gmap-pin" data-active={...} />`. The `pinUrl()` SVG function was not changed. The `gmap-pin` CSS class preserves existing bounce animation and hover/active scale states from globals.css. The `data-active` attribute enables the active pin scale (1.25x) when a venue is selected.
- **User location marker:** `<AdvancedMarker>` wrapping an inline HTML div: outer translucent blue ring (rgba(66,133,244,0.18)) + inner solid blue circle (#4285F4 with white border). Replaces the former SVG data URL approach.
- **mapId switching:** Both `<Map>` instances now receive `mapId={isDark ? NIGHT_ID : DAY_ID}` where `DAY_ID` and `NIGHT_ID` are module-level constants read from `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY` and `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_NIGHT` env vars.
- **MapStyleController removed:** The function that called `map.setOptions({ styles: ... })` is deleted. Day/night map visual styles are now baked into the Google Cloud Console Map IDs.
- **mapStyles.ts cleaned:** `DAY_MAP_STYLES` and `NIGHT_MAP_STYLES` constants removed. `isNightHour()` function kept (still used in Etusivu.tsx for `isDark` state initialization).
- **sportPins.ts cleaned:** `userLocationPinUrl()` function deleted after its usage was replaced by the HTML div approach.
- **.env.local.example created:** Documents all env vars including the two new Map ID vars with setup instructions pointing to Google Cloud Console.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] MapStyleController function deleted in Task 1 instead of Task 2**
- **Found during:** Task 1 build verification
- **Issue:** After removing the two `<MapStyleController>` render calls in Task 1, the function definition remained unused, triggering `@typescript-eslint/no-unused-vars` lint error that caused `npm run build` to exit non-zero.
- **Fix:** Deleted the `MapStyleController` function definition as part of Task 1 (instead of waiting for Task 2). Also removed the `DAY_MAP_STYLES`/`NIGHT_MAP_STYLES` import simultaneously since they were only used inside `MapStyleController`.
- **Files modified:** app/components/Etusivu.tsx
- **Commit:** 13021d4

**2. [Rule 3 - Blocking] Pre-existing unused AnimatePresence import in LiikuntapaikatLista.tsx**
- **Found during:** Task 1 build verification (first attempt against worktree)
- **Issue:** `app/components/LiikuntapaikatLista.tsx` imported `AnimatePresence` from framer-motion but never used it — a pre-existing lint error that was already in the repo. When building from the worktree (where there is no `.env.local`), this error blocked the build.
- **Fix:** Removed `AnimatePresence` from the import statement (kept `motion`).
- **Files modified:** app/components/LiikuntapaikatLista.tsx
- **Commit:** 13021d4

**3. [Environment] Worktree missing .env.local**
- **Found during:** Task 1 build verification
- **Issue:** Git worktrees have separate working trees; the `.env.local` from the main checkout is not present in the worktree. Without it, Next.js fails at the "Collecting page data" phase (Supabase URL required).
- **Fix:** Copied `.env.local` from the main repo into the worktree for build verification purposes. The copy was not committed (it is in `.gitignore`).
- **Impact:** Non-code change; no committed files affected.

## Acceptance Criteria Check

- [x] Etusivu.tsx does NOT import `Marker` from @vis.gl/react-google-maps
- [x] Etusivu.tsx imports `AdvancedMarker` from @vis.gl/react-google-maps
- [x] Etusivu.tsx does NOT import `userLocationPinUrl` from lib/sportPins
- [x] Etusivu.tsx contains exactly 0 occurrences of `<Marker` JSX element
- [x] Etusivu.tsx contains `className="gmap-pin"` on venue pin img elements
- [x] Etusivu.tsx contains `data-active=` on venue pin img elements
- [x] lib/sportPins.ts does NOT contain `userLocationPinUrl`
- [x] Etusivu.tsx does NOT import `DAY_MAP_STYLES` or `NIGHT_MAP_STYLES`
- [x] Etusivu.tsx imports `isNightHour` from lib/mapStyles
- [x] Etusivu.tsx contains `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY` constant
- [x] Etusivu.tsx contains `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_NIGHT` constant
- [x] Etusivu.tsx contains `mapId={isDark ? NIGHT_ID : DAY_ID}` — appears twice
- [x] Etusivu.tsx does NOT contain `MapStyleController`
- [x] Etusivu.tsx does NOT contain `setOptions`
- [x] lib/mapStyles.ts contains `isNightHour` function
- [x] lib/mapStyles.ts does NOT contain `DAY_MAP_STYLES`
- [x] lib/mapStyles.ts does NOT contain `NIGHT_MAP_STYLES`
- [x] .env.local.example exists and contains `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_DAY`
- [x] .env.local.example exists and contains `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID_NIGHT`
- [x] `npm run build` exits 0

## Threat Flags

No new security surface introduced. Map IDs are public identifiers (T-07-01: accepted). GPS coords flow unchanged (T-07-02: accepted). No new packages installed.

## Self-Check: PASSED
