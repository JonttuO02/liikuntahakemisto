---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Käyttäjät, Kartta & Laatu
status: archived
last_updated: "2026-05-27T15:00:00.000Z"
last_activity: 2026-05-27
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 23
  completed_plans: 23
  percent: 100
---

# Project State

## Current Position

Milestone v1.1 — COMPLETE AND ARCHIVED (2026-05-27)

All 6 phases (6–11) done. All 19 v1.1 requirements delivered.
Next: `/gsd:new-milestone` to start v1.2 planning.

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-27 after v1.1 milestone)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** Planning next milestone (v1.2)

## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 6. UI Polish & Data Foundation | ✅ Complete | All 7 plans done; GDPR, Sponsoroitu, city filter, card UI |
| 7. Map Infrastructure | ✅ Complete | AdvancedMarker migration, RecenterButton |
| 8. Map Features | ✅ Complete | GPS ring, pin→mini-card, /?id= deep link, bottom sheet arch |
| 9. Auth & Favorites | ✅ Complete | Supabase Auth, HeartButton, AI personalization |
| 10. City Expansion | ✅ Complete | Helsinki + Turku sync, nearestKaupunki, city-aware AI |
| 11. PWA | ✅ Complete | Serwist SW, manifest, offline page; build verified |

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-05-27:

| Category | Item | Status |
|----------|------|--------|
| feature | /suosikit favorites page | Deferred to v1.2 |
| bug | Sydän-nappi session edge cases | Deferred to v1.2 |
| ops | Google OAuth callback URL manual setup | Requires external config |

## Active Decisions

(carried forward — see PROJECT.md Key Decisions for full list)

- APIProvider placed in layout.tsx so Maps JS API loads once at app startup
- useGPS auto-requests location on mount; status starts as 'requesting' not 'idle'
- lib/aukiolo.ts is single source of truth for open-status + grouped-hours logic
- sessionStorage cache key scoped to calendar day (YYYY-MM-DD) + kaupunki
- Supabase Auth uses per-request createServerClient — never module-scope singleton
- Map focus URL: /?id=<paikka_id> — no ?nakyma=kartta (dead param)
- PWA uses Serwist (@serwist/next + serwist) — next-pwa abandoned
- themeColor in viewport export (Viewport type), NOT metadata

## Accumulated Context

### Key Constraints

- Supabase anon key = read-only (RLS)
- supabase.auth.getUser() server-side — never getSession()
- ANTHROPIC_API_KEY is server-only env var
- deriveKaupungit always prepends 'Kaikki' sentinel — city filter threshold must be > 2, not > 1
- sync-paikat hardcodes Tampere in kaupunki column — fix before running new city syncs

### Architecture Notes

- v1.1: Supabase Auth + favorites table (user_id → paikka_id) + @supabase/ssr
- 3 new packages: @supabase/ssr, @serwist/next, serwist
- Etusivu bottom sheet: sheetPhase 'open'|'sliding'|'closed' state machine
- Map z-50 > NavBar z-40: NavBar hidden on home page (/)
- AI route: GET for anon, POST with suosikkiNimet[] for signed-in

## Performance Metrics

- Requirements total: 19 (v1.1) — all 19 delivered
- Phases: 6 (phases 6–11) — all complete
- Timeline: 6 days (2026-05-21 → 2026-05-27)
