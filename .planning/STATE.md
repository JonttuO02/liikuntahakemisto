---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: AKTIIVI — Redesign & Polish
status: archived
last_updated: "2026-05-30T08:00:00.000Z"
last_activity: 2026-05-30 — v1.3 milestone archived, ready for v1.4
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 6
  completed_plans: 8
  percent: 67
---

# Project State

## Current Position

Milestone: v1.3 AKTIIVI — Redesign & Polish (archived 2026-05-30)
Status: Between milestones — ready for v1.4 planning
Last activity: 2026-05-30 — v1.3 milestone archived

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-29)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v1.3 — AKTIIVI rebrand, toolbar UX, kartan pinni- & korttiuudistus

## Phase Progress

| Phase | Goal | Requirements | Status |
|-------|------|--------------|--------|
| 16. Brändi & Logo-uloke | AKTIIVI rebrand + logo watermark at sheet bottom | BRAND-01, UI-13, UI-14, UI-15, UI-16 | ✅ Complete (4/4 plans) |
| 17. Toolbar & Haku-UX | Unified search+filter button + dedicated list-toggle | UI-17, UI-18 | ✅ Complete (1/1 plan) |
| 18. Kartan pinnit & korttianimaatio | Unified pins with sport SVG icons, clustering, in-place card expansion | MAP-08, MAP-09, MAP-10 | ✅ Complete (3/3 plans) |

## Active Decisions

(carried forward from v1.2 — see PROJECT.md Key Decisions for full list)

- Brand name is AKTIIVI — no "Liikuntahakemisto" in any user-visible metadata (Plan 16-01)
- og:title auto-derives from metadata.title — no separate openGraph block needed (Plan 16-01)
- manifest start_url is '/' — dead /?nakyma=lista param removed (Plan 16-01)
- AktiiviLogo.tsx exists as a standalone SVG component with gradient sweep animation (Plan 16-02)
- AKTIIVI logo watermark: position absolute bottom-0, opacity 0.08, mask-image fade upward, tight viewBox "120 200 1430 560" (Plan 16-04)
- APIProvider placed in layout.tsx so Maps JS API loads once at app startup
- Supabase Auth uses per-request createServerClient — never module-scope singleton
- Map focus URL: /?id=<paikka_id> — no ?nakyma=kartta (dead param)
- PWA uses Serwist (@serwist/next + serwist)
- themeColor in viewport export (Viewport type), NOT metadata
- lib/aukiolo.ts single source of truth for open-status logic
- sessionStorage cache key scoped to calendar day + kaupunki
- Pin color is always #ef4444 — sport identity communicated by icon shape, not color (Plan 18-01)
- Cluster grouping key uses ±0.0001° rounding (~11m); popup uses reference equality for toggle (Plan 18-02)
- Record<string,T[]> used for coord grouping (TS 5.9.3 Map<K,V> generic regression workaround) (Plan 18-02)

## Accumulated Context

### Key Constraints

- Supabase anon key = read-only (RLS)
- supabase.auth.getUser() server-side — never getSession()
- ANTHROPIC_API_KEY is server-only env var
- deriveKaupungit always prepends 'Kaikki' sentinel — city filter threshold must be > 2, not > 1
- Static Maps API key = NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (same as JS API key)

### Architecture Notes

- v1.3: Search and filter are currently separate UI elements — Phase 17 unifies them into one button
- v1.3: List view toggle (?nakyma=lista) currently has no dedicated button — Phase 17 adds one
- v1.3: Kartan pinnit — @vis.gl/react-google-maps AdvancedMarker, SVG-ikonit lajeittain (lib/lajit.ts)
- v1.3: Klusterointi — sama-osoite-case: ryhmittely koordinaattien perusteella, popup/list
- v1.3: Kortti in-place — sheet state machine / Framer Motion layoutId animation

### Open Questions

- Google OAuth callback URL still needs manual setup in Google Cloud Console + Supabase dashboard
- v1.3: Klusterin click → lista vai sheet expansion? (todennäköisesti pieni popup kartalla)
