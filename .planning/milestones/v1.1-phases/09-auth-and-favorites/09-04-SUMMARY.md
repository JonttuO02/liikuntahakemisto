---
phase: 09-auth-and-favorites
plan: "04"
subsystem: api
tags: [anthropic, claude-haiku, ai-personalization, open-meteo, favorites, supabase]

# Dependency graph
requires:
  - phase: 09-auth-and-favorites
    provides: suosikitIds Set<number> in Etusivu.tsx populated by 09-03 favorites engine
provides:
  - POST /api/saasuositus handler that injects user favorites into Claude Haiku prompt
  - Personalized AI weather recommendation for signed-in users with favorites
  - Cache-busting via favorites count in sessionStorage key
affects: [phase-11-pwa, future-ai-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared async helper (fetchWeather) extracts duplicated logic from GET and POST handlers"
    - "Session cache key includes count suffix to bust stale personalization"
    - "POST body carries venue names (not IDs) so no server-side DB lookup needed"

key-files:
  created: []
  modified:
    - app/api/saasuositus/route.ts
    - app/components/Etusivu.tsx

key-decisions:
  - "Shared fetchWeather() helper used by both GET and POST — no logic duplication"
  - "POST clamps suosikit to 10 items per AUTH-03 token budget constraint"
  - "suosikitIds drives effect dependency; paikat intentionally excluded to prevent spurious calls on router.refresh()"
  - "Cache key includes suosikitIds.size so personalized and generic responses never collide"

patterns-established:
  - "AI route: GET for anonymous, POST for authenticated with context"
  - "Client sends venue names (not IDs) in POST body — avoids server-side JOIN"

requirements-completed: [AUTH-03]

# Metrics
duration: 15min
completed: 2026-05-23
---

# Phase 9 Plan 04: AI Personalization Summary

**POST /api/saasuositus lisätty — suosikkipaikkoje nimet lisätään Claude Haiku -promptiin, kun käyttäjä on kirjautunut sisään**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-23T06:45:00Z
- **Completed:** 2026-05-23T07:00:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- GET-käsittelijä säilyi koskemattomana takaisinyhteensopivuuden vuoksi
- Yhteinen `fetchWeather()` apufunktio poistaa sään hakemiseen liittyvän koodin kahdentamisen
- POST-käsittelijä hyväksyy `suosikit: string[]`, rajoittaa 10:een ja liittää ne Haiku-promptiin
- Etusivu hakee AI-suosituksen GET:llä kun ei suosikkeja, POST:lla kun suosikkeja on
- Istunnon välimuistiavain sisältää suosikkien lukumäärän — henkilökohtainen vastaus ei mene vanhentuneesta välimuistista

## Task Commits

Jokainen tehtävä commitoitu erikseen:

1. **T-04-1: Lisää POST-käsittelijä saasuositus-reitille** - `4ede94d` (feat)
2. **T-04-2: Käytä POST:ia suosikeilla Etusivu AI-haussa** - `087231e` (feat)

**Suunnitelma metatiedot:** (tämä commit)

## Files Created/Modified

- `app/api/saasuositus/route.ts` — Lisätty `fetchWeather()` apufunktio + POST-käsittelijä suosikkipersonalisoinnilla
- `app/components/Etusivu.tsx` — AI-hakuefekti käyttää nyt POST:ia suosikeilla, riippuvuus muutettu `suosikitIds`-tilaan

## Decisions Made

- Venue names (not IDs) sent in POST body — server needs no DB lookup, simpler and faster
- Effect depends only on `suosikitIds`, not `paikat` — prevents spurious refetches when `router.refresh()` changes the paikat reference
- Cache key suffix is `suosikitIds.size`, not a content hash — acceptable for MVP (AUTH-03 budget discussion resolved in PLAN.md open questions)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Build passed with zero new errors (two pre-existing ESLint warnings from prior phases unrelated to this plan).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 9 (Auth & Favorites) is now complete:
- 09-01: foundation (middleware, supabaseSSR, types, DB schema) ✅
- 09-02: AuthModal + server auth wiring ✅
- 09-03: Heart buttons + favorites engine ✅
- 09-04: AI personalization ✅

Phase 10 (City Expansion) is next. Prerequisite: fix `sync-paikat` hardcoded Tampere in `kaupunki` column before running Helsinki/Turku syncs.

---
*Phase: 09-auth-and-favorites*
*Completed: 2026-05-23*
