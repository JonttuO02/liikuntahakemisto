---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: Yritysportaali
status: verifying
last_updated: "2026-06-10T20:27:35.564Z"
last_activity: 2026-06-10 -- Wave 4 gap plans (35-10, 35-11) executed — Phase 35 all 11 plans complete
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 35
  completed_plans: 39
  percent: 67
---

# Project State

## Current Position

Phase: 35 (admin-hyväksyntäjärjestelmä) — COMPLETE (11/11 plans)
Status: All gap-closure plans executed. Run /gsd:verify-work 35 to verify phase goal.
Last activity: 2026-06-10 -- Wave 4 gap plans (35-10, 35-11) executed — Phase 35 all 11 plans complete

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-05)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** Phase 35 — admin-hyväksyntäjärjestelmä

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
| 31 | DB-skeema & Storage-perusta | BIZ-02, DATA-09, DATA-10 | Complete |
| 32 | Yritysrekisteröinti & auth | BIZ-01, BIZ-03 | Planned (3 plans) |
| 33 | Claim & paikan luonti | CLAIM-01, CLAIM-02, CLAIM-03 | Complete |
| 34 | Onboarding-velhou | ONBOARD-01–07 | Planned (9 plans) |
| 35 | Admin-hyväksyntäjärjestelmä | ADMIN-01–05 | Complete |
| 36 | Hallintapaneeli | BIZPANEL-01–03 | Not started |

## Blockers/Concerns

None.

## Session Continuity

Last session: 2026-06-10T20:27:35.558Z
Resume: `/gsd:verify-work 35` — Verify phase 35 goal achievement
