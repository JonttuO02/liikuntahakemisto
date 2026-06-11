---
gsd_state_version: 1.0
milestone: v1.7
milestone_name: Yritysportaali
status: archived
last_updated: "2026-06-11T13:45:00.000Z"
last_activity: 2026-06-11 -- v1.7 Yritysportaali milestone complete and archived
progress:
  total_phases: 6
  completed_phases: 6
  total_plans: 44
  completed_plans: 44
  percent: 100
---

# Project State

## Current Position

Milestone: v1.7 Yritysportaali — **ARCHIVED**
Status: Milestone complete. All 6 phases (31–36), 44 plans done. Ready for next milestone.
Last activity: 2026-06-11 — v1.7 milestone archived, git tag v1.7 created

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-11)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** Planning next milestone (v1.8) — run `/gsd:new-milestone`

## Active Decisions (carried forward)

- URL routing: `/` and `/?nakyma=kartta` both render Etusivu — `?nakyma=kartta` is a dead parameter
- GPS: client-side only, never URL params
- AI widget: never SSR, use `/api/saasuositus` Route Handler
- Supabase writes: service role key only; anon key is read-only after RLS
- CSS animations on AdvancedMarker: transform/opacity ONLY
- SVG icons: path-string approach in lib/sportIcons.tsx
- i18n: next-intl without-routing + NEXT_LOCALE cookie
- Business auth: same Supabase Auth as regular users; role differentiated via business_accounts table
- Business media: Supabase Storage bucket `business-media`; RLS per yritys via business_paikka_links
- Business data priority: yrityksen data ylikirjoittaa Google Places -datan; business_managed-flag suojaa sync-skriptiltä
- Admin approval: required for initial registration; edits after approval are instant
- Claim visibility: claim-paikka pysyy näkyvänä; uusi paikka hidden until approved
- URLs: /business for panel, /business/onboarding for wizard, /admin for admin
- JWT verification: supabaseAdmin.auth.getUser(token) at every Route Handler boundary
- Storage RLS: SECURITY DEFINER function in public schema (storage schema forbidden on hosted Supabase)

## Phase Sequence (v1.7 — all complete)

| Phase | Name | Status |
|-------|------|--------|
| 31 | DB-skeema & Storage-perusta | ✅ Complete |
| 32 | Yritysrekisteröinti & auth | ✅ Complete |
| 33 | Claim & paikan luonti | ✅ Complete |
| 34 | Onboarding-velhou | ✅ Complete |
| 35 | Admin-hyväksyntäjärjestelmä | ✅ Complete |
| 36 | Hallintapaneeli | ✅ Complete |

## Known Tech Debt (v1.8 backlog)

- Phase 33: no VERIFICATION.md (smoke-tested only)
- Phase 36: no VERIFICATION.md (UAT passed only)
- claim-paikka route missing business_managed=true UPDATE (sync window)
- Wizard orchestrator duplication: OnboardingWizardInner + EditWizardInner share steps but duplicate routing/guard/draft-fetch logic
- onboarding_completed column written but never read (dead data)
- /admin no server-side middleware

## Blockers/Concerns

None.

## Session Continuity

Last session: 2026-06-11T13:45:00.000Z
Resume: v1.7 archived. Run `/gsd:new-milestone` to start v1.8 planning.
