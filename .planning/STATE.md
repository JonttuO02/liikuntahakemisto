---
gsd_state_version: 1.0
milestone: v1.9
milestone_name: Auth-Separaatio & Cleanup
status: completed
stopped_at: Phase 40 executed (3/3 plans complete) — CLEAN-01 pending manual DB push
last_updated: "2026-06-12T08:30:00.000Z"
last_activity: 2026-06-12 — Phase 40 executed (3/3 plans)
progress:
  total_phases: 2
  completed_phases: 2
  total_plans: 7
  completed_plans: 7
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-11)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v1.9 milestone complete — ready for archiving

## Current Position

Phase: 40 of 40 (Wizard-konsolidointi & Cleanup) — COMPLETE (verification: human_needed for CLEAN-01)
Status: All 7 plans complete across phases 39–40. CLEAN-01 requires manual Supabase DB push.
Last activity: 2026-06-12 — Phase 40 executed (3/3 plans)

Progress: [██████████] 100%

## v1.9 Direction

**Core decision (2026-06-11):** Consumer- ja business-puolen auth-sessiot eriytetään cookie-nimiavaruuksilla. `/business/*`-reitit käyttävät `sb-biz-*`-cookiea, consumer-reitit käyttävät normaalia `sb-*`-cookiea. Sessiot ovat täysin riippumattomia — molempiin vaaditaan oma kirjautuminen.

- Ei uusia ominaisuuksia — puhdas arkkitehtuuri- ja siivousmilestone
- Testitilit poistetaan (kaikki ovat testitilejä, ei tuotantodataa)
- Phase 39 jatkaa v1.8:n numerointia (päättyi 38:aan)

## Active Decisions (carried forward)

- URL routing: `/` ja `/?nakyma=kartta` molemmat renderöivät Etusivun — `?nakyma=kartta` on kuollut parametri
- GPS: client-side only, never URL params
- AI widget: never SSR, use `/api/saasuositus` Route Handler
- Supabase writes: service role key only; anon key is read-only after RLS
- Storage RLS: SECURITY DEFINER function in public schema (storage schema forbidden)
- JWT verification: supabaseAdmin.auth.getUser(token) at every Route Handler boundary
- Middleware: never query DB from middleware (Edge Runtime); use RSC layout for auth checks
- **v1.9 NEW**: Business routes use `sb-biz-*` cookie namespace; consumer routes use default `sb-*`
- **v1.9 NEW**: `createBusinessServerClient()` and `createBusinessBrowserClient()` in `lib/supabase-business.ts`
- **v1.9 NEW**: Single `WizardInner` component (mode: 'onboarding' | 'edit') replaces OnboardingWizardInner + EditWizardInner

## Accumulated Context

### Decisions

- Phase 40: WizardInner yhdistetty yhdeksi tiedostoksi — OnboardingMode ja EditMode private sub-komponentteina
- Phase 38: Admin-hyväksyntä julkaisee paikan atomisesti Postgres-triggerillä (published=true + business_managed=true yhdessä transaktiossa)
- Phase 37: Middleware ei tee DB-kyselyitä — auth-tarkistukset RSC layout-komponenteissa

### Pending Todos

- CLEAN-01: Aja `DELETE FROM auth.users WHERE id IN (SELECT user_id FROM business_accounts);` Supabase Dashboardissa tai `supabase db push` CLI:llä — poistaa kaikki testitilit

### Blockers/Concerns

- Code review CR-01: `app/business/[id]/page.tsx` lukee paikan tiedot ilman omistajuustarkistusta (pre-existing issue, ei phase 40 -muutos)
- Code review CR-02: `app/api/business/onboarding/submit/route.ts` ei filtteroi `paikka_id`:llä (pre-existing issue)

## Session Continuity

Last session: 2026-06-12T08:30:00.000Z
Stopped at: Phase 40 complete — v1.9 milestone ready for archiving
Resume file: None — run /gsd:complete-milestone to archive v1.9
