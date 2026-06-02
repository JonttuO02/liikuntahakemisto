---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Visuaalinen elävöitys & UX-hienosäätö
status: archived
last_updated: "2026-06-02T22:45:00.000Z"
last_activity: 2026-06-02 — v1.5 milestone archived
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 9
  completed_plans: 9
  percent: 100
---

# Project State

## Current Position

Milestone v1.5 archived. All 4 phases (23–26), 9 plans complete.

**Next step:** `/gsd:new-milestone` to define v1.6.

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-02)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** Planning v1.6

## Phase Progress

| Phase | Name | Status |
|-------|------|--------|
| 23 | Visuaalinen perusta | ✅ Complete |
| 24 | Callout-kortti & ikonit | ✅ Complete |
| 25 | TO DO overlay | ✅ Complete |
| 26 | Filtterit | ✅ Complete |

## Active Decisions (carried to v1.6)

- URL routing: `/` and `/?nakyma=kartta` both render Etusivu — `?nakyma=kartta` is a dead parameter
- GPS: client-side only, never URL params
- AI widget: never SSR, use `/api/saasuositus` Route Handler
- Supabase writes: service role key only; anon key is read-only after RLS
- CSS animations on AdvancedMarker: transform/opacity ONLY — no box-shadow, background, filter
- Map focus URL: `/?id=<paikka_id>` — never `?nakyma=kartta`
- sessionStorage key 'etusivu-scroll-state' _v: 2 SHIPPED — old sessions rejected
- SPORT_ICONS duplicated in CalloutCard (Etusivu.tsx) and SportPin.tsx — can be refactored to lib/lajit.ts

## Session Continuity

Last session: 2026-06-02
Stopped at: milestone archive complete
Resume: Start /gsd:new-milestone for v1.6
