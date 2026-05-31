---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: UX-parannukset & Profiili
status: in_progress
stopped_at: Phase 21 executed (2026-05-31)
last_updated: "2026-05-31T00:00:00.000Z"
last_activity: 2026-05-31 — Phase 21 executed (21-01, 21-02 complete)
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 7
  completed_plans: 7
  percent: 75
---

# Project State

## Current Position

Phase: 21 of 22 (TO DO -lista) — executed, pending verification
Plan: 2/2 complete (Wave 1)
Status: Phase 21 executed — ready for verify-work
Last activity: 2026-05-31 — Phase 21 executed (TODO-01, TODO-02)

Progress: [█████░░░░░] 50%

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-30)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v1.4 — Phase 21: TO DO -lista

## Phase Progress

| Phase | Goal | Status |
|-------|------|--------|
| 19. Filtteri, lista & paikka-UX | Kertakäynti-filtteri, kuva listakorttiin, pin-nappi, image_url | Done |
| 20. Navigaatio-korjaukset | Back-scroll, kartalle-kohdistus, bottomsheet-avaus, toolbar | Done |
| 21. TO DO -lista | Suosikit → TO DO, sydän → kirjanmerkki, /suosikit-sivu | Executed (2/2 plans) |
| 22. Profiili & AI-kiinnostukset | Kiinnostuksen kohteet, AI-promptiin | Not started |

## Active Decisions

(carried from v1.3 — see PROJECT.md Key Decisions for full list)

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

Last session: 2026-05-31T04:18:23.875Z
Stopped at: context exhaustion at 76% (2026-05-31)
Resume file: None
