---
phase: 10-city-expansion
plan: "04"
subsystem: ui
tags: [etusivu, weather, city-aware, debounce, ai-widget]
dependency_graph:
  requires:
    - 10-01 (nearestKaupunki from lib/geo.ts, SUOMI_KAUPUNGIT from lib/constants.ts)
    - 10-03 (city-aware GET/POST /api/saasuositus)
  provides:
    - Map-center-aware weatherKaupunki state in Etusivu
    - 3s debounced nearestKaupunki update on map pan
    - AI widget city label updates dynamically with map position
  affects:
    - app/components/Etusivu.tsx
tech_stack:
  added: []
  patterns:
    - ref-based debounce (setTimeout/clearTimeout via useRef)
    - functional setState with prev-comparison to avoid spurious re-renders
    - per-city sessionStorage cache key for AI recommendation text
key_files:
  created: []
  modified:
    - app/components/Etusivu.tsx
    - lib/constants.ts (worktree sync — SUOMI_KAUPUNGIT added)
    - lib/geo.ts (worktree sync — nearestKaupunki added)
decisions:
  - debounceRef uses ReturnType<typeof setTimeout> for type safety on both Node and browser
  - setWeatherKaupunki uses prev-comparison functional form to prevent React from triggering the AI effect dependency on same-city re-pans
  - Cache key format: saasuositus-<date>-<city>[-<count>] — city-scoped per day
  - saa weather fetch (Open Meteo at Tampere coords) left unchanged; temperature number always Tampere, AI text is city-aware
metrics:
  duration: "5m"
  completed: "2026-05-27T09:10:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase 10 Plan 04: Map-center-aware AI widget city tracking — Summary

Etusivu now detects which Finnish city the map center is nearest to (via 3s debounce + nearestKaupunki), updates weatherKaupunki state, and passes the city name to /api/saasuositus for city-aware AI recommendations and cache keying.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Add mapCenter state, debounce ref, and weatherKaupunki state | 8902e61 | app/components/Etusivu.tsx, lib/constants.ts, lib/geo.ts |
| 2 | Pass weatherKaupunki to AI fetch and update cache key | 4a9a9d3 | app/components/Etusivu.tsx |

## What Was Built

### app/components/Etusivu.tsx

- Added `import { nearestKaupunki } from '@/lib/geo'`
- Removed module-level `const WEATHER_CITY = 'Tampere'` — replaced by dynamic state
- Added `useState<{ lat: number; lng: number }>(TAMPERE)` for `mapCenter`
- Added `useState<string>('Tampere')` for `weatherKaupunki`
- Added `useRef<ReturnType<typeof setTimeout> | null>(null)` for `debounceRef`
- Extended `onCameraChanged`: tracks center → `setMapCenter`, cancels previous debounce, sets 3s timeout → calls `nearestKaupunki` → `setWeatherKaupunki(prev => nearest !== prev ? nearest : prev)`
- Replaced `{WEATHER_CITY}` JSX with `{weatherKaupunki}` in AI widget temperature display
- AI fetch useEffect: cache key now includes `weatherKaupunki`; GET uses `?kaupunki=encodeURIComponent(weatherKaupunki)`; POST body includes `kaupunki: weatherKaupunki`; dependency array is `[suosikitSizeAndIds, weatherKaupunki]`

### lib/constants.ts and lib/geo.ts (worktree sync)

Both files updated to match master — this worktree was created before Plans 01/02 were merged; SUOMI_KAUPUNGIT and nearestKaupunki were not present.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] lib/constants.ts and lib/geo.ts missing Plan 01 exports in worktree**
- **Found during:** Task 1 — TypeScript error `Module '"@/lib/geo"' has no exported member 'nearestKaupunki'`
- **Issue:** This worktree was created from master before Plan 01 (SUOMI_KAUPUNGIT + nearestKaupunki) was merged. The worktree had the old single-export constants.ts and geo.ts without nearestKaupunki.
- **Fix:** Read canonical implementations from `git show master:lib/constants.ts` and `git show master:lib/geo.ts`, wrote them to the worktree. Same pattern as Plan 03 applied for constants.ts.
- **Files modified:** lib/constants.ts, lib/geo.ts
- **Commit:** 8902e61 (included with Task 1 changes)

## Threat Surface

T-10-04-01 (DoS — rapid panning) mitigated: 3s debounce via ref-based clearTimeout/setTimeout. Only fires when city changes (prev-comparison functional setState). Daily cache per city reduces API calls further.

T-10-04-02 (Tampering — nearestKaupunki output in URL) mitigated: nearestKaupunki returns values from SUOMI_KAUPUNGIT static array only; encodeURIComponent applied to GET query param.

## Known Stubs

None — weatherKaupunki is fully wired: debounce sets it → AI fetch reads it → cache key includes it → JSX displays it.

## Threat Flags

None — no new trust boundaries introduced. The weatherKaupunki string is derived from SUOMI_KAUPUNGIT (static whitelist) and flows into the existing /api/saasuositus trust boundary already covered by Plan 03's threat model.

## Self-Check: PASSED

- app/components/Etusivu.tsx: FOUND
- lib/constants.ts (with SUOMI_KAUPUNGIT): FOUND
- lib/geo.ts (with nearestKaupunki): FOUND
- Commit 8902e61 (Task 1 — state + debounce): FOUND
- Commit 4a9a9d3 (Task 2 — AI fetch + cache key): FOUND
- TypeScript: zero errors
- WEATHER_CITY removed: confirmed
- weatherKaupunki in dependency array: confirmed
- encodeURIComponent(weatherKaupunki) in GET path: confirmed
