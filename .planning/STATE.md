---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: AKTIIVI — Redesign & Polish
status: planning
last_updated: "2026-05-29T00:00:00.000Z"
last_activity: 2026-05-29 -- Roadmap created; Phases 16-18 defined
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Current Position

Phase: 16 — Brändi & Logo-uloke (not started)
Plan: —
Status: Roadmap defined; ready for Phase 16 planning
Last activity: 2026-05-29 — v1.3 roadmap written (Phases 16–18)

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-29)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v1.3 — AKTIIVI rebrand, logo-uloke, toolbar UX, kartan pinni- & korttiuudistus

## Phase Progress

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 16. Brändi & Logo-uloke | AKTIIVI rebrand + always-visible logo tab with gradient animation | BRAND-01, UI-13, UI-14, UI-15, UI-16 | Not started |
| 17. Toolbar & Haku-UX | Unified search+filter button + dedicated list-toggle | UI-17, UI-18 | Not started |
| 18. Kartan pinnit & korttianimaatio | Unified pins with sport SVG icons, clustering, in-place card expansion | MAP-08, MAP-09, MAP-10 | Not started |

## Active Decisions

(carried forward from v1.2 — see PROJECT.md Key Decisions for full list)

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
- Static Maps API key = NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (same as JS API key)

### Architecture Notes

- v1.3: AKTIIVI SVG-logo tulee käyttäjältä — placeholder käytetään kunnes logo toimitetaan
- v1.3: Bottom sheet -uloke (tab/handle) rakennetaan Etusivu.tsx:n sheetPhase state machinen päälle
- v1.3: Logon värianimaatio — Framer Motion + SVG text fill (gradient definitions in SVG/CSS)
- v1.3: Toolbar UX — hakupainike yhdistetään filtteri-paneeliin; lista-toggle eriytetään
- v1.3: Kartan pinnit — @vis.gl/react-google-maps AdvancedMarker, SVG-ikonit lajeittain (lib/lajit.ts)
- v1.3: Klusterointi — sama-osoite-case: ryhmittely koordinaattien perusteella, popup/list
- v1.3: Kortti in-place — sheet state machine / Framer Motion layoutId animation

### Open Questions

- Google OAuth callback URL still needs manual setup in Google Cloud Console + Supabase dashboard
- v1.3: Sporttisten liukuvärien 5 väriä päätetään logo-ulokevaiheen UI-SPEC:issä
- v1.3: Klusterin click → lista vai sheet expansion? (todennäköisesti pieni popup kartalla)
