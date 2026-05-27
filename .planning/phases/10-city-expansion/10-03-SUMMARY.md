---
phase: 10-city-expansion
plan: "03"
subsystem: api
tags: [weather, ai, city-aware, saasuositus, parameterization]
dependency_graph:
  requires:
    - 10-01 (SUOMI_KAUPUNGIT from lib/constants.ts)
  provides:
    - City-aware GET /api/saasuositus?kaupunki=<city>
    - City-aware POST /api/saasuositus with body.kaupunki
  affects:
    - app/api/saasuositus/route.ts
    - lib/constants.ts (brought SUOMI_KAUPUNGIT into worktree)
tech_stack:
  added: []
  patterns:
    - SUOMI_KAUPUNGIT whitelist lookup for coordinate safety (T-10-03-01 mitigation)
    - kaupunki param in both GET query string and POST body
    - lookupCity() helper extracts SUOMI_KAUPUNGIT.find + Tampere fallback
key_files:
  created: []
  modified:
    - app/api/saasuositus/route.ts
    - lib/constants.ts
decisions:
  - lookupCity() helper function centralizes SUOMI_KAUPUNGIT.find + Tampere coordinate fallback — used by both GET and POST
  - getTimeBasedFallback now takes explicit string param (no default) since all callers pass kaupunki
  - 'Tampere' appears exactly 2 times as literal — one in GET fallback, one in POST fallback initial value
  - lib/constants.ts updated in this worktree to match master (Plan 01 merge was not in worktree)
metrics:
  duration: "5m"
  completed: "2026-05-27T08:14:23Z"
  tasks_completed: 1
  tasks_total: 1
  files_modified: 2
---

# Phase 10 Plan 03: Saasuositus route city parameterization — Summary

fetchWeather parameterized with lat/lng coordinates, GET and POST handlers read kaupunki param, Claude Haiku prompt uses dynamic city name; Tampere remains the fallback default.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Parameterize fetchWeather and add kaupunki to GET/POST handlers | 849702d | app/api/saasuositus/route.ts, lib/constants.ts |

## What Was Built

### app/api/saasuositus/route.ts

- Added `import { SUOMI_KAUPUNGIT } from '@/lib/constants'` at top
- `fetchWeather(lat: number, lng: number)` — replaces hardcoded `latitude=61.4978&longitude=23.7610` with dynamic template string
- `lookupCity(kaupunki: string)` — new helper: `SUOMI_KAUPUNGIT.find(c => c.nimi === kaupunki) ?? { lat: 61.4978, lng: 23.7610 }` (Tampere fallback coordinates for unknown city names)
- `getTimeBasedFallback(kaupunki: string)` — explicit typed param; dynamic `${kaupunki}lta` in all three time-of-day strings
- `GET(request: Request)` — reads `?kaupunki=` param (`?? 'Tampere'`), looks up city, fetches weather, uses `${kaupunki}ssa` in Haiku prompt
- `POST(request: Request)` — reads `body.kaupunki` with `typeof === 'string'` guard, same lookup + prompt pattern
- Response shape `{ text, temp, code, fallback }` unchanged — Etusivu.tsx requires no modification

### lib/constants.ts

- Updated to include SUOMI_KAUPUNGIT 25-city array (worktree was created before Plan 01 merge to master; contents now match master)

## Verification Results

- TypeScript: `npx tsc --noEmit` — zero errors
- `'Tampere'` literal count: 2 (at most 2 per acceptance criteria)
- `grep "SUOMI_KAUPUNGIT" route.ts` — import + lookup both present
- `grep "fetchWeather(city.lat" route.ts` — matches in both GET and POST
- `grep -c "kaupunki" route.ts` — 17 lines (>= 8 per acceptance criteria)
- `61.4978` not present in `fetchWeather` function body — coordinates are parameters, not literals

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] lib/constants.ts missing SUOMI_KAUPUNGIT in worktree**
- **Found during:** Task 1 — TypeScript compile error `Module '"@/lib/constants"' has no exported member 'SUOMI_KAUPUNGIT'`
- **Issue:** This worktree was created from master before Plan 01 (`feat(10-01): add SUOMI_KAUPUNGIT`) was merged. The worktree's `lib/constants.ts` only had `export const TAMPERE = ...`. Plan 03 `depends_on: [10-01]` but the worktree did not have the dependency's output.
- **Fix:** Read the canonical `SUOMI_KAUPUNGIT` array from `git show master:lib/constants.ts` (Plan 01 is already merged to master at `05a00a7`), wrote the full array to the worktree's `lib/constants.ts`.
- **Files modified:** lib/constants.ts
- **Commit:** 849702d (combined with route.ts changes)

**2. [Rule 1 - Bug] getTimeBasedFallback default param removed to reduce 'Tampere' literal count**
- **Found during:** Task 1 acceptance criteria check — count was 3 instead of ≤ 2
- **Issue:** `getTimeBasedFallback(kaupunki = 'Tampere')` added a third `'Tampere'` literal. Since all call sites already pass an explicit `kaupunki` value, the default was unnecessary.
- **Fix:** Changed to `getTimeBasedFallback(kaupunki: string)` — explicit required param. Reduces literal count from 3 to 2.
- **Files modified:** app/api/saasuositus/route.ts
- **Outcome:** Acceptance criteria AC1 (≤ 2 'Tampere' literals) passes

## Threat Surface

T-10-03-01 mitigation applied: `kaupunki` from both GET query string and POST body is validated — GET uses `?? 'Tampere'` fallback, POST uses `typeof === 'string'` guard. Coordinate lookup goes through the SUOMI_KAUPUNGIT whitelist; unknown city names fall back to Tampere coordinates (not injected into the Open Meteo URL directly). The kaupunki string is interpolated into the Haiku prompt but Haiku output is a short recommendation text, not executed code.

## Known Stubs

None — the route fully implements city-aware behavior with real coordinate lookup and real API calls.

## Threat Flags

None — no new trust boundaries introduced. The kaupunki parameter is a new client-supplied string that flows into the Haiku prompt (covered by T-10-03-01 in the plan's threat register with `mitigate` disposition; mitigation applied).

## Self-Check: PASSED

- app/api/saasuositus/route.ts: FOUND
- lib/constants.ts (with SUOMI_KAUPUNGIT): FOUND
- Commit 849702d: FOUND
- TypeScript: zero errors
- SUMMARY.md: FOUND (this file)
