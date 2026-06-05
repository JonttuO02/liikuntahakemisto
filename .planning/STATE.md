---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: Yritysportaali
status: active
last_updated: "2026-06-05T00:00:00.000Z"
last_activity: 2026-06-05 -- Phase 31 Wave 1 complete (plans 01-03 merged; Wave 2 pending push)
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 4
  completed_plans: 3
  percent: 8
---

# Project State

## Current Position

Phase: Phase 31 — DB-skeema & Storage-perusta (Wave 1 complete — Wave 2 pending)
Plan: 4/4 plans (3 complete, 1 pending: PLAN-04 DB push + manual steps)
Status: Wave 2 ready — run `supabase db push` then manual SQL Editor steps
Last activity: 2026-06-05 — Wave 1 merged (plans 01-03): migrations + Storage SQL + sync filter; 81/81 tests green

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
- Business media: Supabase Storage bucket `business-media`; RLS per yritys via business_paikka_links
- Business data priority: yrityksen data ylikirjoittaa Google Places -datan; business_managed-flag suojaa sync-skriptiltä
- Admin approval: required for initial registration; edits after approval are instant (no re-approval)
- Claim visibility: claim-paikka pysyy näkyvänä; uusi paikka hidden (published=false) until approved
- URLs: /business for panel, /business/onboarding for wizard, /admin for admin
- No payments in v1.7; no separate Supabase project

## Phase Sequence

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 31 | DB-skeema & Storage-perusta | BIZ-02, DATA-09, DATA-10 | Planned (4 plans) |
| 32 | Yritysrekisteröinti & auth | BIZ-01, BIZ-03 | Not started |
| 33 | Claim & paikan luonti | CLAIM-01, CLAIM-02, CLAIM-03 | Not started |
| 34 | Onboarding-velhou | ONBOARD-01–07 | Not started |
| 35 | Admin-hyväksyntäjärjestelmä | ADMIN-01–05 | Not started |
| 36 | Hallintapaneeli | BIZPANEL-01–03 | Not started |

## Blockers/Concerns

None.

## Session Continuity

Last session: 2026-06-05T00:00:00.000Z
Resume: `/gsd:execute-phase 31` to execute (4 plans ready)
