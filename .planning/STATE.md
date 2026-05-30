---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: UX-parannukset & Profiili
status: executing
last_updated: "2026-05-30T14:00:00.000Z"
last_activity: 2026-05-30 — Phase 20 executed (2/2 plans complete)
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 5
  completed_plans: 5
  percent: 50
---

# Project State

## Current Position

Phase: 21 of 22 (TO DO -lista) — ready to plan
Plan: —
Status: Phase 20 complete (2/2 plans) — Phase 21 next
Last activity: 2026-05-30 — Phase 20 executed (NAV-01, NAV-02, NAV-03, NAV-04, NAV-05)

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
| 21. TO DO -lista | Suosikit → TO DO, sydän → kirjanmerkki, /suosikit-sivu | Not started |
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
- NavPill expanded menu: exactly Profiili, Suosikit, Kirjaudu — no Haku link (NAV-04 done)

### Open Questions

- Google OAuth callback URL still needs manual setup in Google Cloud Console + Supabase dashboard

## Session Continuity

Last session: 2026-05-30
Stopped at: Phase 20 complete — ready for /gsd:verify-work 20 or /gsd:discuss-phase 21
Resume file: .planning/phases/20-navigaatio-korjaukset/20-02-SUMMARY.md
