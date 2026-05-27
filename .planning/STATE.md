---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: UI-uudistus & Arvostelut
status: planning
last_updated: "2026-05-27T16:00:00.000Z"
last_activity: 2026-05-27
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 5
  completed_plans: 3
  percent: 25
---

# Project State

## Current Position

Phase: Phase 13 — Uusi korttimalli (planned, ready to execute)
Plan: —
Status: Phase 13 planned (2 plans, 2 waves); ready to execute
Last activity: 2026-05-27 — Phase 13 planned (commit 9cf5341)

[░░░░░░░░░░░░░░░░░░░░] 0% — 0/4 phases complete

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-27)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v1.2 — UI-uudistus & Arvostelut

## Phase Progress

| Phase | Status | Plans |
|-------|--------|-------|
| 12. Haku & korttilistaus etusivulle | ✅ Complete | 3/3 |
| 13. Uusi korttimalli | 📋 Planned | 0/2 |
| 14. Profiilisivu & AI-kotipaikkakunta | Not started | 0/TBD |
| 15. Arvostelut | Not started | 0/TBD |

## Active Decisions

(carried forward from v1.1 — see PROJECT.md Key Decisions for full list)

- APIProvider placed in layout.tsx so Maps JS API loads once at app startup
- Supabase Auth uses per-request createServerClient — never module-scope singleton
- Map focus URL: /?id=<paikka_id> — no ?nakyma=kartta (dead param)
- PWA uses Serwist (@serwist/next + serwist)
- themeColor in viewport export (Viewport type), NOT metadata
- lib/aukiolo.ts single source of truth for open-status logic
- sessionStorage cache key scoped to calendar day + kaupunki

## Accumulated Context

### Key Constraints

- Supabase anon key = read-only (RLS)
- supabase.auth.getUser() server-side — never getSession()
- ANTHROPIC_API_KEY is server-only env var
- deriveKaupungit always prepends 'Kaikki' sentinel — city filter threshold must be > 2, not > 1
- /?nakyma=lista is DEAD — LiikuntapaikatLista being removed in Phase 12
- Static Maps API key = NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (same as JS API key)

### Architecture Notes

- Phase 12: Search panel lives in Etusivu.tsx left toolbar; sheetPhase state machine may need new state for search open/closed
- Phase 13: Google Static Maps snapshot via `https://maps.googleapis.com/maps/api/staticmap` — uses NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; rendered client-side in <img> tag
- Phase 14: kotikaupunki stored in a separate `profiles` Supabase table (user_id FK → auth.users); service role key for writes, RLS for reads
- Phase 15: reviews table needs Supabase migration + RLS (1 review/user/paikka enforced by unique constraint); average computed via Postgres aggregate or Supabase view

### Open Questions

- Google OAuth callback URL still needs manual setup in Google Cloud Console + Supabase dashboard
- Static Maps API: confirm HTTP referrer restrictions are compatible with img src usage (vs server-side proxy)
- Phase 14 dependency: does Phase 14 need Phase 12/13 complete first, or can it run in parallel? (Roadmap has Phase 14 depends on Phase 11 — parallel with 12/13 is valid)
