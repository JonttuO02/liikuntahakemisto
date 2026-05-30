---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: UX-parannukset & Profiili
status: planning
last_updated: "2026-05-30T08:00:00.000Z"
last_activity: 2026-05-30 — Milestone v1.4 started
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
Last activity: 2026-05-30 — Milestone v1.4 started

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-30)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v1.4 — Navigaatio-korjaukset, TO DO -lista, paikka kuvat, kiinnostuksen kohteet profiiliin

## Phase Progress

(No phases yet — roadmap being created)

## Active Decisions

(carried forward from v1.3 — see PROJECT.md Key Decisions for full list)

- Brand name is AKTIIVI — no "Liikuntahakemisto" in any user-visible metadata
- Supabase Auth uses per-request createServerClient — never module-scope singleton
- Map focus URL: /?id=<paikka_id> — no ?nakyma=kartta (dead param)
- PWA uses Serwist (@serwist/next + serwist)
- Pin color is always #ef4444 — sport identity communicated by icon shape, not color
- lib/aukiolo.ts single source of truth for open-status logic
- sessionStorage cache key scoped to calendar day + kaupunki

## Accumulated Context

### Key Constraints

- Supabase anon key = read-only (RLS)
- supabase.auth.getUser() server-side — never getSession()
- ANTHROPIC_API_KEY is server-only env var
- deriveKaupungit always prepends 'Kaikki' sentinel — city filter threshold must be > 2, not > 1
- Static Maps API key = NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (same as JS API key)

### Architecture Notes

- v1.4: TO DO replaces suosikit entirely — heart icon → bookmark icon across all UI
- v1.4: image_url is a manual field in Supabase paikat table; placeholder shown if null
- v1.4: "Näytä kartalla" centers on place coordinates, not user GPS
- v1.4: Bottom sheet starts closed on homepage load, animates open immediately

### Open Questions

- Google OAuth callback URL still needs manual setup in Google Cloud Console + Supabase dashboard
