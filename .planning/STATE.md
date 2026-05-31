---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Visuaalinen elävöitys & UX-hienosäätö
status: planning
stopped_at: ""
last_updated: "2026-05-31T12:00:00.000Z"
last_activity: 2026-05-31 — Milestone v1.5 started
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-05-31 — Milestone v1.5 started

Progress: [__________] 0%

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-30)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v1.5 — Visuaalinen elävöitys & UX-hienosäätö (planning)

## Phase Progress

*(Roadmap ei vielä luotu — odottaa requirements-vaihetta)*

## Active Decisions

(carried from v1.4 — see PROJECT.md Key Decisions for full list)

- Brand name is AKTIIVI in all user-visible metadata
- Map focus URL: /?id=<paikka_id> — never ?nakyma=kartta (dead param)
- Pin color is always #ef4444 — sport identity via icon shape, not color
- Supabase Auth uses per-request createServerClient — never module-scope singleton
- PWA uses Serwist (@serwist/next + serwist)
- v1.4: TO DO replaces suosikit entirely — heart icon → bookmark icon across all UI
- v1.4: image_url is a manual field in paikat table; placeholder shown if null
- v1.4: "Näytä kartalla" centers on venue coordinates, not user GPS; bottomsheet stays closed
- v1.4: Bottom sheet starts closed on homepage load, animates open immediately (Phase 20 implemented)
- v1.4: sessionStorage key 'etusivu-scroll-state' persists scroll+filter state for back-nav (Phase 20)
- v1.4: kiinnostukset sent in AI POST body unconditionally (empty array is harmless); NOT added to useEffect deps (D-13 cache key is day-based only)

## Accumulated Context

### Key Constraints

- Supabase anon key = read-only (RLS); service role key for writes
- supabase.auth.getUser() server-side — never getSession()
- ANTHROPIC_API_KEY is server-only env var
- deriveKaupungit always prepends 'Kaikki' sentinel — city filter threshold must be > 2
- Static Maps API key = NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
- NavPill expanded menu: exactly Profiili, TO DO, Kirjaudu — no Haku link (NAV-04 done)

### Open Questions

- Google OAuth callback URL still needs manual setup in Google Cloud Console + Supabase dashboard

## Session Continuity

Last session: 2026-05-31T11:23:38.954Z
Stopped at: context exhaustion at 75% (2026-05-31)
Resume file: None
