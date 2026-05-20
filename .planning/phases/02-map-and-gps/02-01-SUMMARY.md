---
phase: 02-map-and-gps
plan: 01
subsystem: maps-foundation
tags: [maps, gps, refactor, constants]
dependency_graph:
  requires: []
  provides:
    - lib/constants.ts → TAMPERE canonical coordinate
    - lib/geo.ts → haversineKm + formatDistance utilities
    - hooks/useGPS.ts → GPS state machine hook
    - app/layout.tsx → APIProvider wrapping entire app
  affects:
    - app/components/Etusivu.tsx
    - app/components/Kartta.tsx
    - app/api/hae-paikat/route.ts
    - app/api/admin/sync-paikat/route.ts
tech_stack:
  added:
    - "@vis.gl/react-google-maps (npm)"
  patterns:
    - "Single-source-of-truth constants via lib/constants.ts"
    - "GPS state machine with auto-request on mount"
    - "APIProvider wraps entire app in layout.tsx"
key_files:
  created:
    - lib/constants.ts
    - lib/geo.ts
    - hooks/useGPS.ts
  modified:
    - app/layout.tsx
    - app/components/Etusivu.tsx
    - app/components/Kartta.tsx
    - app/api/hae-paikat/route.ts
    - app/api/admin/sync-paikat/route.ts
decisions:
  - "APIProvider placed in layout.tsx (server component) so Maps JS API loads once at app startup"
  - "useGPS initial status set to 'requesting' with auto-request on mount (not 'idle')"
  - "@react-google-maps/api kept installed — both libraries coexist during migration to Plan 03"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-21"
  tasks: 2
  files: 10
---

# Phase 02 Plan 01: Maps Foundation — Install @vis.gl + Foundation Files Summary

## One-liner

Installed @vis.gl/react-google-maps, created lib/constants.ts (TAMPERE), lib/geo.ts (haversine/formatDistance), hooks/useGPS.ts (GPS state machine with auto-request), and wired APIProvider into app/layout.tsx — eliminating all 4 TAMPERE constant duplicates.

## What Was Done

### Task 1: Install and create foundation files

- Installed `@vis.gl/react-google-maps` (2 packages added, no audit issues blocking install)
- Created `lib/constants.ts` with the single canonical `TAMPERE = { lat: 61.4978, lng: 23.761 }` export
- Created `lib/geo.ts` with `haversineKm()` (Haversine formula, atan2 form) and `formatDistance()` (Finnish locale, 4-tier rounding)
- Created `hooks/useGPS.ts` with `useGPS()` hook — status machine with 'idle'|'requesting'|'granted'|'denied'|'unavailable'|'timeout', auto-requests GPS on mount via useEffect
- Removed `const TAMPERE` from `app/components/Etusivu.tsx` and `app/components/Kartta.tsx`, replaced with `import { TAMPERE } from '@/lib/constants'`
- Removed `TAMPERE_LAT`/`TAMPERE_LNG` locals from `app/api/hae-paikat/route.ts` and `app/api/admin/sync-paikat/route.ts`, replaced with `import { TAMPERE }` and updated `url.searchParams.set('location', ...)` calls to `TAMPERE.lat`/`TAMPERE.lng`

### Task 2: APIProvider in layout.tsx

- Added `import { APIProvider } from '@vis.gl/react-google-maps'` to `app/layout.tsx`
- Wrapped `<NavBar />` + `<main>{children}</main>` with `<APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}>`
- All existing imports (Inter, Playfair_Display, globals.css, cn, NavBar, metadata) preserved unchanged

## TypeScript Status

`npx tsc --noEmit` exits 0 — zero TypeScript errors.

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | PASS |
| `grep -r "const TAMPERE" app/` | 0 results (PASS) |
| `grep -r "TAMPERE_LAT" app/` | 0 results (PASS) |
| `grep -r "useJsApiLoader" app/` | 2 results (Etusivu.tsx, Kartta.tsx) — expected, migration in Plan 03 |

## Deviations from Plan

None — plan executed exactly as written.

The `grep -r "const TAMPERE" app/ lib/` check in the plan's verification section includes `lib/`, where `lib/constants.ts` correctly exports `const TAMPERE` — this is the canonical definition, not a duplicate. The plan's success criterion ("Zero TAMPERE constant duplicates remain across the codebase") is satisfied: only one definition exists and it's in `lib/constants.ts`.

## Known Stubs

None. This plan creates utility files and wiring — no UI stubs or placeholder data.

## Threat Flags

No new security surface beyond the plan's threat model. Coords are held in React state only (T-02-01 mitigated by hook design). NEXT_PUBLIC key is accepted per T-02-02.

## Self-Check: PASSED

- `lib/constants.ts` — FOUND
- `lib/geo.ts` — FOUND
- `hooks/useGPS.ts` — FOUND
- `app/layout.tsx` contains APIProvider — FOUND
- Commit d4431f0 — FOUND
