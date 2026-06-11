---
gsd_state_version: 1.0
milestone: v1.8
milestone_name: Yritysportaali v2 — Julkistaminen & UX
status: executing
stopped_at: Phase 38 context gathered
last_updated: "2026-06-11T16:21:43.660Z"
last_activity: 2026-06-11 -- Phase 38 execution started
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 2
  completed_plans: 1
  percent: 33
---

# Project State

## Current Position

Phase: 38 (business-data-publication) — EXECUTING
Plan: 1 of 1
Status: Executing Phase 38
Last activity: 2026-06-11 -- Phase 38 execution started

Progress: [░░░░░░░░░░] 0%

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-11)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** Phase 38 — business-data-publication

## Phase Sequence (v1.8)

- [ ] Phase 37: Tech Debt Foundation — DEBT-01..05 + BIZUX-01
- [ ] Phase 38: Business Data Publication — PUB-01..04
- [ ] Phase 39: Business User UX — BIZUX-02..05

## Active Decisions (carried forward)

- URL routing: `/` and `/?nakyma=kartta` both render Etusivu — `?nakyma=kartta` is a dead parameter
- GPS: client-side only, never URL params
- AI widget: never SSR, use `/api/saasuositus` Route Handler
- Supabase writes: service role key only; anon key is read-only after RLS
- Business auth: same Supabase Auth as regular users; role via business_accounts table
- Storage RLS: SECURITY DEFINER function in public schema (storage schema forbidden)
- JWT verification: supabaseAdmin.auth.getUser(token) at every Route Handler boundary
- Admin approval: required for initial registration; edits after approval are instant
- Middleware: never query DB from middleware (Edge Runtime); use RSC layout for business role check

## Known Tech Debt Being Addressed in v1.8

- claim-paikka route missing business_managed=true UPDATE (DEBT-02)
- Wizard auth useEffect duplication — replaced by RSC guard (DEBT-01 + BIZUX-01)
- onboarding_completed column written but never read (DEBT-04)
- /admin no server-side middleware protection (DEBT-03)
- onboarding draft delete not scoped by paikka_id (DEBT-05)

## Blockers/Concerns

- KarttatYdin extraction scope (Phase 39): Etusivu is ~1700 lines. Exact boundary to confirm at planning time. Mitigation: build /business/map/page.tsx as standalone first, then extract.
- Verification badge timing: is_claimed=true is set at claim submission, not at approval. Badge will show on pending/rejected venues. Confirm intended behavior during Phase 38 planning.

## Session Continuity

Last session: 2026-06-11T15:57:33.730Z
Stopped at: Phase 38 context gathered
Resume file: .planning/phases/38-business-data-publication/38-CONTEXT.md
