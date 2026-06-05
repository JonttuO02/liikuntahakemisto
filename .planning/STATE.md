---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: Yritysportaali
status: planning
last_updated: "2026-06-05T00:00:00.000Z"
last_activity: 2026-06-05 -- v1.7 milestone started; requirements defined
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Current Position

Phase: Not started (defining roadmap)
Plan: —
Status: Defining roadmap
Last activity: 2026-06-05 — Milestone v1.7 started (Yritysportaali)

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-05)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v1.7 Yritysportaali — Business Auth, Onboarding, Admin-hyväksyntä, Hallintapaneeli

## Active Decisions (carried to v1.7)

- URL routing: `/` and `/?nakyma=kartta` both render Etusivu — `?nakyma=kartta` is a dead parameter
- GPS: client-side only, never URL params
- AI widget: never SSR, use `/api/saasuositus` Route Handler
- Supabase writes: service role key only; anon key is read-only after RLS
- CSS animations on AdvancedMarker: transform/opacity ONLY — no box-shadow, background, filter
- SVG icons: path-string approach in lib/sportIcons.tsx, no @svgr/webpack (Phase 28)
- i18n: next-intl without-routing + NEXT_LOCALE cookie, not localStorage (Phase 30)
- Business auth: same Supabase Auth as regular users; role differentiated via business_accounts table
- Business media: Supabase Storage bucket `business-media`; RLS per yritys
- Business data priority: yrityksen data ylikirjoittaa Google Places -datan; business_managed-flag

## Phase Sequence

*(Defined by roadmapper — TBD)*

## Blockers/Concerns

None.

## Session Continuity

Last session: 2026-06-05T00:00:00.000Z
Resume: `/gsd:plan-phase [N]` once roadmap is created
