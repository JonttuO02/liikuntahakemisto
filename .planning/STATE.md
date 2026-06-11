---
gsd_state_version: 1.0
milestone: v1.9
milestone_name: Auth-Separaatio & Cleanup
status: ready_to_execute
stopped_at: Phase 39 planned
last_updated: "2026-06-12T00:00:00.000Z"
last_activity: 2026-06-12 — Phase 39 planned (4 plans, 3 waves)
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 4
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-11)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** Phase 39 — Auth-Separaatio

## Current Position

Phase: 39 of 40 (Auth-Separaatio)
Plan: 4 plans ready (3 waves)
Status: Ready to execute
Last activity: 2026-06-12 — Phase 39 planned

Progress: [░░░░░░░░░░] 0%

## v1.9 Direction

**Core decision (2026-06-11):** Consumer- ja business-puolen auth-sessiot eriytetään cookie-nimiavaruuksilla. `/business/*`-reitit käyttävät `sb-biz-*`-cookiea, consumer-reitit käyttävät normaalia `sb-*`-cookiea. Sessiot ovat täysin riippumattomia — molempiin vaaditaan oma kirjautuminen.

- Ei uusia ominaisuuksia — puhdas arkkitehtuuri- ja siivousmilestone
- Testitilit poistetaan (kaikki ovat testitilejä, ei tuotantodataa)
- Phase 39 jatkaa v1.8:n numerointia (päättyi 38:aan)
- v1.8 review fixit (muokatut tiedostot) tulee commitoida ennen execution-aloitusta

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

## Accumulated Context

### Decisions

- Phase 38: Admin-hyväksyntä julkaisee paikan atomisesti Postgres-triggerillä (published=true + business_managed=true yhdessä transaktiossa)
- Phase 37: Middleware ei tee DB-kyselyitä — auth-tarkistukset RSC layout-komponenteissa

### Pending Todos

None.

### Blockers/Concerns

- Uncommitted v1.8 review fixes exist (see git status) — commit these before starting Phase 39 execution

## Session Continuity

Last session: 2026-06-11T21:02:11.598Z
Stopped at: Phase 39 planned (4 plans, 3 waves)
Resume file: .planning/phases/39-auth-separaatio/39-01-PLAN.md
