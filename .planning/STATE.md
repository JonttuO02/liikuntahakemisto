---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Kielituki, Ikonit & Sheet-redesign
status: planning
last_updated: "2026-06-03T00:00:00.000Z"
last_activity: 2026-06-03 — Milestone v1.6 started
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
Last activity: 2026-06-03 — Milestone v1.6 started

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-03)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** Planning v1.6

## Active Decisions (carried to v1.6)

- URL routing: `/` and `/?nakyma=kartta` both render Etusivu — `?nakyma=kartta` is a dead parameter
- GPS: client-side only, never URL params
- AI widget: never SSR, use `/api/saasuositus` Route Handler
- Supabase writes: service role key only; anon key is read-only after RLS
- CSS animations on AdvancedMarker: transform/opacity ONLY — no box-shadow, background, filter
- Map focus URL: `/?id=<paikka_id>` — never `?nakyma=kartta`
- sessionStorage key 'etusivu-scroll-state' _v: 2 SHIPPED — old sessions rejected
- SPORT_ICONS duplicated in CalloutCard (Etusivu.tsx) and SportPin.tsx — to be unified in v1.6 ICON-01
- i18n: next-intl without-routing + NEXT_LOCALE cookie (not localStorage) — decided v1.6 planning
- SVG icons: path-string approach in lib/sportIcons.ts, no @svgr/webpack — decided v1.6 planning

## Session Continuity

Last session: 2026-06-03
Stopped at: requirements defined, roadmap pending
Resume: Start /gsd:plan-phase [N] after roadmap is created
