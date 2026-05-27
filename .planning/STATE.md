---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Phases
status: executing
last_updated: "2026-05-27T11:26:17.664Z"
last_activity: 2026-05-27 -- Phase 11 execution started
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 19
  completed_plans: 20
  percent: 67
---

# Project State

## Current Position

Phase: 11 (PWA) — EXECUTING
Plan: 1 of 3
Status: Executing Phase 11
Last activity: 2026-05-27 -- Phase 11 execution started

## Project Reference

See: .planning/PROJECT.md

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** Phase 11 — PWA

## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 6. UI Polish & Data Foundation | ✅ Complete | UAT passed; 1 inline fix (city filter sentinel off-by-one) |
| 7. Map Infrastructure | ✅ Complete | 2/2 plans done; 4 manual UAT checks pending (GPS + day/night + preview button absent) |
| 8. Map Features | ✅ Complete | 3/3 plans done; Etusivu refactored to bottom sheet architecture |
| 9. Auth & Favorites | ✅ Complete | All 4 plans done: foundation, AuthModal, favorites engine, AI personalization |
| 10. City Expansion | ✅ Complete | 4/4 plans done: SUOMI_KAUPUNGIT, sync parameterization, saasuositus city-aware, Etusivu map-center debounce |
| 11. PWA | 📋 Planned (0/3) | 3 plans: packages+icons, SW config, manifest+offline page |

## Active Decisions

(inherited from v1.0)

- APIProvider placed in layout.tsx so Maps JS API loads once at app startup
- useGPS auto-requests location on mount; status starts as 'requesting' not 'idle'
- lib/aukiolo.ts is single source of truth for open-status + grouped-hours logic
- sessionStorage cache key scoped to calendar day (YYYY-MM-DD)
- ANTHROPIC_API_KEY is server-only env var — SDK reads it automatically, never NEXT_PUBLIC_

(v1.1 additions)

- LEGAL-01 ships in Phase 6 — must be live before auth (Phase 9) goes out ✅ DONE
- AdvancedMarker migration complete ✅ DONE — Phase 8 map features now unblocked
- Supabase Auth uses per-request createServerClient — never the existing module-scope singleton
- middleware.ts created ✅ — refreshes Supabase session on every non-static request (Phase 9 Plan 01)
- toggleSuosikki calls getUser() on each invocation — avoids stale auth state from closure
- suosikitIds: Set<number> lives in both LiikuntapaikatLista and Etusivu — drives AI personalization (09-04 complete)
- AI route: GET for anonymous users, POST with suosikkiNimet[] for signed-in users; cache key includes count suffix
- fetchWeather() shared helper in route.ts — single source of truth for Open Meteo fetch + weather description
- HeartButton is a standalone client component (no shared auth state) — manages own subscription lifecycle
- Map focus URL: /?id=<paikka_id> — focusId effect sets sheetPhase('sliding'), closes sheet and pans map (NOT /?nakyma=kartta&id=...)
- PWA must use Serwist (@serwist/next + serwist) — next-pwa and @ducanh2912/next-pwa are abandoned
- Service worker must exclude _rsc requests and be disabled in dev mode
- useGPS now takes { autoRequest?: boolean } param (default false) — Etusivu passes true, LiikuntapaikatLista uses default

(post-phase-8 bottom sheet refactor)

- Etusivu bottom sheet architecture: `sheetPhase: 'open' | 'sliding' | 'closed'` replaces old `kartaAuki` boolean
  - 'open': sheet at 82% viewport height
  - 'sliding': y animates to contentH (off-screen), triggers onAnimationComplete
  - 'closed': sheet narrows to 160px-wide pill at bottom center, y springs up to show 44px (HANDLE_H)
- Map is always position: fixed, top/left/right/bottom: 0, z-50 — covers NavBar (z-40)
- NavBar is NOT visible on the home page (/) — map z-50 covers NavBar z-40; NavBar remains in layout.tsx and shows on all other pages (/paikat/[id], /suosikit, /tietosuoja)
- Left top-corner toolbar (z-64): SlidersHorizontal icon expands right to show filter dropdown + venue count
- Right top-corner toolbar (z-64): MoreHorizontal icon expands left to show Search link (/?nakyma=lista) + Heart link (/suosikit)
- Shared backdrop (z-63): closes all toolbars/filter on outside click
- Filter pills removed from Etusivu — replaced by left toolbar dropdown
- AI widget and Karuselli now live inside the bottom sheet (not in page flow)
- Map gestureHandling: 'none' when sheet open, 'greedy' otherwise
- Heart/auth state in home page context: must go in the right toolbar (MoreHorizontal), NOT in NavBar (NavBar not visible on home page)
- MAP_BOTTOM_SHEET_PLAN.md in .planning/ is now implemented

## Accumulated Context

### Key Constraints

- Supabase Auth v1.1: suosikit vaativat tilin, muu toimii anonyymisti
- AdvancedMarker requires NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID env var + mapId on both Map instances ✅ DONE
- supabase.auth.getUser() server-side — never getSession() (reads unvalidated cookie)
- RLS INSERT needs WITH CHECK not USING for favorites table
- sync-paikat hardcodes Tampere in kaupunki column — fix before running Helsinki/Turku syncs
- AUTH-03 token budget: include max 5–10 favorites in Claude Haiku prompt
- deriveKaupungit always prepends 'Kaikki' sentinel — city filter threshold must be > 2, not > 1

### Architecture Notes

- Supabase anon key = read-only (RLS v1.0:sta)
- v1.1 adds Supabase Auth + favorites table (user_id → paikka_id)
- kaupunki column needs verification in live Supabase DB before DATA-05/06
- 3 new npm packages total: @supabase/ssr, @serwist/next, serwist
- All other v1.1 features use already-installed packages
- lib/urlUtils.ts added in Phase 6 — isSafeUrl() guards all varauslinkki href renders
- RecenterButton uses useMap() — resolves correctly within the single always-mounted fixed map
- Etusivu.tsx bottom sheet refactor: kartaAuki boolean, 3D preview map, fullscreen expand animation, kartaInteractive, EASE_MAP — all removed; replaced by sheetPhase state machine

### Open Questions (before Phase 9)

- Google OAuth: Configure callback URL in Google Cloud Console + Supabase dashboard redirect URL

### Open Questions (before Phase 11)

- PWA icons: Generate public/icon-192x192.png and public/icon-512x512.png from acta-symbol.svg
- Confirm next dev (not --turbo) is standard — Serwist requires webpack

## Performance Metrics

- Requirements total: 19 (v1.1)
- Requirements mapped: 19/19
- Phases: 6 (phases 6–11)

## Session Continuity

- Last session: Phase 11 planned — Serwist PWA (install+icons, SW config, manifest+offline page), 3 plans in 2 waves, verification passed
- Stopped at: Phase 11 planned (3 plans verified); ready to execute
- Resume: /gsd:execute-phase 11
