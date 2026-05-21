---
phase: 05-ai-weather-widget
plan: 01
subsystem: api
tags: [anthropic, claude, open-meteo, route-handler, weather, nextjs, typescript]

# Dependency graph
requires:
  - phase: 04-service-information-ui
    provides: aukioloajat and hinta_kuvaus columns in DB (needed by page.tsx select fix)
provides:
  - GET /api/saasuositus returning { text: string, temp: number, code: number }
  - Fixed page.tsx select query fetching aukioloajat and hinta_kuvaus
  - @anthropic-ai/sdk installed in dependencies
affects:
  - 05-02-etusivu-wiring (consumes /api/saasuositus via useEffect fetch)

# Tech tracking
tech-stack:
  added: ["@anthropic-ai/sdk ^0.x"]
  patterns:
    - "Route Handler with dual external API calls (Open-Meteo + Claude), each independently failable"
    - "Time-based Finnish fallback text when AI unavailable"
    - "WMO weather code to Finnish description mapping"
    - "next: { revalidate: 1800 } on Open-Meteo fetch for 30-min ISR cache"

key-files:
  created:
    - app/api/saasuositus/route.ts
  modified:
    - app/page.tsx
    - package.json
    - package-lock.json

key-decisions:
  - "ANTHROPIC_API_KEY is server-only env var — never NEXT_PUBLIC_ prefixed; SDK reads it automatically"
  - "Open-Meteo failure defaults to temp=15, code=0 (clear sky) so Claude still runs with sensible values"
  - "Claude failure returns time-based Finnish fallback, not an error response — widget is always non-blocking"
  - "weatherDesc string is computed separately from the inline ternary for readability"

patterns-established:
  - "Route Handler pattern: two catch blocks (weather + Claude), both resolve to valid HTTP 200"
  - "DAY_FI const array indexed by getDay() — same pattern used in hae-paikat/route.ts for DAY_NAMES"

requirements-completed: [AI-01, AI-02, AI-03]

# Metrics
duration: 2min
completed: 2026-05-21
---

# Phase 5 Plan 01: AI Weather Widget — Backend Summary

**Claude Haiku Route Handler fetching Tampere weather from Open-Meteo and returning a Finnish sport recommendation with graceful fallback on any API failure**

## Performance

- **Duration:** 2 min
- **Started:** 2026-05-21T10:43:32Z
- **Completed:** 2026-05-21T10:45:03Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Fixed Phase 4 data bug: `app/page.tsx` `.select()` now includes `aukioloajat` and `hinta_kuvaus` so venue cards receive live opening hours and price description
- Installed `@anthropic-ai/sdk` and confirmed `ANTHROPIC_API_KEY` already present in `.env.local`
- Created `app/api/saasuositus/route.ts` — public Route Handler that fetches Tampere weather (lat=61.4978, lng=23.7610) from Open-Meteo, maps WMO code to Finnish description, calls Claude Haiku with a Finnish prompt, and always returns HTTP 200 with `{ text, temp, code }`

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Phase 4 bug — add missing columns to page.tsx select** - `f1a258b` (fix)
2. **Task 2: Install @anthropic-ai/sdk and verify .env.local** - `b2b682f` (chore)
3. **Task 3: Create app/api/saasuositus/route.ts Route Handler** - `a6fc525` (feat)

## Files Created/Modified

- `app/api/saasuositus/route.ts` — Route Handler: Open-Meteo fetch, WMO code mapping, Claude Haiku call, time-based fallback
- `app/page.tsx` — Added `aukioloajat, hinta_kuvaus` to Supabase `.select()` string
- `package.json` — Added `@anthropic-ai/sdk` dependency
- `package-lock.json` — Updated lockfile

## Decisions Made

- `ANTHROPIC_API_KEY` is server-only (no `NEXT_PUBLIC_` prefix) — confirmed by plan's threat model T-05-01
- Open-Meteo failure uses `temp=15, code=0` defaults so Claude still generates a relevant recommendation
- Claude failure path returns `getTimeBasedFallback()` — hour-based Finnish greeting rather than an error
- `weatherDesc` extracted as a named variable (not inline ternary inside the template string) for clarity

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. TypeScript passed with zero errors after all three tasks. `@anthropic-ai/sdk` installed cleanly (6 packages added). `ANTHROPIC_API_KEY` was already a real key in `.env.local` — no placeholder needed.

## User Setup Required

None - `ANTHROPIC_API_KEY` is already configured in `.env.local` with a real key.

Manual verification (after `npm run dev`):
```
curl http://localhost:3000/api/saasuositus
# Expected: { "text": "...", "temp": <number>, "code": <number> }
```

## Next Phase Readiness

- `GET /api/saasuositus` is ready for 05-02 to wire into `Etusivu.tsx` via `useEffect` fetch
- `app/page.tsx` now passes `aukioloajat` and `hinta_kuvaus` to child components — Phase 4 badges fully data-backed
- No blockers

---
*Phase: 05-ai-weather-widget*
*Completed: 2026-05-21*
