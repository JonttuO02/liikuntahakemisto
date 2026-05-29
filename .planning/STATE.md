---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: AKTIIVI — Redesign & Polish
status: in_progress
last_updated: "2026-05-29T00:00:00.000Z"
last_activity: 2026-05-29 — Phase 16 Plan 02 complete — AktiiviLogo SVG component with gradient sweep
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 2
  completed_plans: 2
  percent: 10
---

# Project State

## Current Position

Phase: 16 — Brändi & Logo-uloke (in progress)
Plan: 01 (complete), 02 (complete), 03+ (pending)
Status: Plan 02 shipped — AktiiviLogo SVG component with animated gradient sweep
Last activity: 2026-05-29 — Phase 16 Plan 02 complete (commit 282f84c)

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-29)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v1.3 — AKTIIVI rebrand, logo-uloke, toolbar UX, kartan pinni- & korttiuudistus

## Phase Progress

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 16. Brändi & Logo-uloke | AKTIIVI rebrand + always-visible logo tab with gradient animation | BRAND-01, UI-13, UI-14, UI-15, UI-16 | In progress (2/? plans) |
| 17. Toolbar & Haku-UX | Unified search+filter button + dedicated list-toggle | UI-17, UI-18 | Not started |
| 18. Kartan pinnit & korttianimaatio | Unified pins with sport SVG icons, clustering, in-place card expansion | MAP-08, MAP-09, MAP-10 | Not started |

## Active Decisions

(carried forward from v1.2 — see PROJECT.md Key Decisions for full list)

- Brand name is AKTIIVI — no "Liikuntahakemisto" in any user-visible metadata (Plan 16-01)
- og:title auto-derives from metadata.title — no separate openGraph block needed (Plan 16-01)
- manifest start_url is '/' — dead /?nakyma=lista param removed (Plan 16-01)
- AktiiviLogo uses animate(element, keyframes, options) imperative API for SVG rect width (Plan 16-02)
- AktiiviLogo prevIndex tracked via useState+useRef combo: useState triggers re-render, useRef gives immediate access in animation callback (Plan 16-02)
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
