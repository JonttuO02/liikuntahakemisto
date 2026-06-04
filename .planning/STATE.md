---
gsd_state_version: 1.0
milestone: v1.6
milestone_name: Kielituki, Ikonit & Sheet-redesign
status: planning
last_updated: "2026-06-04T15:00:00.000Z"
last_activity: 2026-06-04 -- Phase 29 complete; Phase 30 next
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 15
  completed_plans: 15
  percent: 75
---

# Project State

## Current Position

Phase: 30 (i18n FI/EN) — READY TO EXECUTE
Status: Phase 30 planned — 4 plans in 3 waves, verified
Last activity: 2026-06-04 -- Phase 30 planned

Progress: [███░░░░░░░] 75%

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-03)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** Phase 30 — i18n FI/EN

## Active Decisions (carried to v1.6)

- URL routing: `/` and `/?nakyma=kartta` both render Etusivu — `?nakyma=kartta` is a dead parameter
- GPS: client-side only, never URL params
- AI widget: never SSR, use `/api/saasuositus` Route Handler
- Supabase writes: service role key only; anon key is read-only after RLS
- CSS animations on AdvancedMarker: transform/opacity ONLY — no box-shadow, background, filter
- sessionStorage key 'etusivu-scroll-state' _v: 2 SHIPPED — old sessions rejected
- SVG icons: path-string approach in lib/sportIcons.ts, no @svgr/webpack (Phase 28)
- i18n: next-intl without-routing + NEXT_LOCALE cookie, not localStorage (Phase 30)
- Language toggle location: /profiili only — NOT NavBar
- Images: placeholders in v1.6 (gray box + camera icon)

## Phase Sequence

| Phase | Name | Requirements | Depends on |
|-------|------|--------------|------------|
| 27 | Siivous & pienet korjaukset | NAV-06, NAV-07, FILTER-04, FILTER-05, SEARCH-01, UI-24, MAP-16, SHEET-04, SHEET-05, SHEET-06 | Phase 26 |
| 28 | SVG-ikonit | ICON-01, ICON-02 | Phase 27 |
| 29 | Kortit & sheet redesign | UI-25, UI-26, UI-27, SHEET-01, SHEET-02, SHEET-03 | Phase 28 |
| 30 | i18n FI/EN | I18N-01, I18N-02, I18N-03 | Phase 29 |

## Blockers/Concerns

None.

## Session Continuity

Last session: 2026-06-04T15:00:00.000Z
Resume: `/gsd:execute-phase 30`
