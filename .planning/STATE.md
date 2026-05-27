---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: UI-uudistus & Arvostelut
status: planning
last_updated: "2026-05-27T16:00:00.000Z"
last_activity: 2026-05-27
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
Last activity: 2026-05-27 — Milestone v1.2 started

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-27)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v1.2 — UI-uudistus & Arvostelut

## Phase Progress

(Phases TBD — roadmap pending)

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
- /?nakyma=lista is now DEAD — LiikuntapaikatLista being removed in v1.2

### Architecture Notes

- v1.2: Static Maps API (NEXT_PUBLIC_ or server?) TBD at plan phase
- v1.2: reviews table needs Supabase migration + RLS (1 review/user/paikka constraint)
- v1.2: kotikaupunki stored in Supabase user metadata or separate profiles table TBD
- Google Maps Static API key same as JS API key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)

### Open Questions

- Google OAuth callback URL still needs manual setup in Google Cloud Console + Supabase dashboard
- Static Maps API: use same NEXT_PUBLIC_GOOGLE_MAPS_API_KEY or a separate server-side key?
