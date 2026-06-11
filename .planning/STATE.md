---
gsd_state_version: 1.0
milestone: v1.9
milestone_name: Auth-Separaatio & Cleanup
status: planning
stopped_at: Requirements defined; roadmap pending
last_updated: "2026-06-11T00:00:00.000Z"
last_activity: 2026-06-11 -- v1.9 milestone started
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
Last activity: 2026-06-11 — Milestone v1.9 started

## v1.9 Direction

**Core decision (2026-06-11):** Consumer- ja business-puolen auth-sessiot eriytetään cookie-nimiavaruuksilla. `/business/*`-reitit käyttävät `sb-biz-*`-cookiea, consumer-reitit käyttävät normaalia `sb-*`-cookiea. Sessiot ovat täysin riippumattomia — molempiin vaaditaan oma kirjautuminen.

- Ei uusia ominaisuuksia — puhdas arkkitehtuuri- ja siivousmilestone
- Testitilit poistetaan (ne ovat kaikki testitilejä, ei tuotantotietoja)
- Phase 39 on seuraava numero (v1.8 päättyi 38:aan)
- Ennen execution: committamattomat v1.8 review fixit pitää commitoida ensin

## Active Decisions (carried forward)

- URL routing: `/` ja `/?nakyma=kartta` molemmat renderöivät Etusivun — `?nakyma=kartta` on kuollut parametri
- GPS: client-side only, never URL params
- AI widget: never SSR, use `/api/saasuositus` Route Handler
- Supabase writes: service role key only; anon key is read-only after RLS
- Storage RLS: SECURITY DEFINER function in public schema (storage schema forbidden)
- JWT verification: supabaseAdmin.auth.getUser(token) at every Route Handler boundary
- Admin approval: required for initial registration; edits after approval are instant
- Middleware: never query DB from middleware (Edge Runtime); use RSC layout for auth checks
- **NEW v1.9**: Business routes use sb-biz-* cookie namespace; consumer routes use default sb-* namespace

## Session Continuity

Last session: 2026-06-11
Stopped at: v1.9 requirements defined; roadmapper pending
