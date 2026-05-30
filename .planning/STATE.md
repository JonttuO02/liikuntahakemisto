---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: UX-parannukset & Profiili
status: executing
last_updated: "2026-05-30T10:00:00.000Z"
last_activity: 2026-05-30 — Phase 19 executed (all 3 plans complete)
progress:
  total_phases: 4
  completed_phases: 1
  total_plans: 3
  completed_plans: 3
  percent: 25
---

# Project State

## Current Position

Phase: 19 of 22 (Filtteri, lista & paikka-UX) — complete
Plan: —
Status: Phase 19 done — ready to verify or proceed to Phase 20
Last activity: 2026-05-30 — Phase 19 executed (all 3 plans complete)

Progress: [██░░░░░░░░] 25%

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-30)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v1.4 — Phase 19: Filtteri, lista & paikka-UX

## Phase Progress

| Phase | Goal | Status |
|-------|------|--------|
| 19. Filtteri, lista & paikka-UX | Kertakäynti-filtteri, kuva listakorttiin, pin-nappi, image_url | Done |
| 20. Navigaatio-korjaukset | Back-scroll, kartalle-kohdistus, bottomsheet-avaus, toolbar | Not started |
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
- v1.4: Bottom sheet starts closed on homepage load, animates open immediately

## Accumulated Context

### Key Constraints

- Supabase anon key = read-only (RLS); service role key for writes
- supabase.auth.getUser() server-side — never getSession()
- ANTHROPIC_API_KEY is server-only env var
- deriveKaupungit always prepends 'Kaikki' sentinel — city filter threshold must be > 2
- Static Maps API key = NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

### Open Questions

- Google OAuth callback URL still needs manual setup in Google Cloud Console + Supabase dashboard

## Session Continuity

Last session: 2026-05-30
Stopped at: Phase 19 complete — ready for /gsd:verify-work 19 or /gsd:execute-phase 20
Resume file: .planning/phases/19-filtteri-lista-paikka-ux/19-03-SUMMARY.md
