---
gsd_state_version: 1.0
milestone: v1.9
milestone_name: TBD — Business/Consumer Architecture Separation
status: idle
stopped_at: v1.8 closed; v1.9 not yet planned
last_updated: "2026-06-11T00:00:00.000Z"
last_activity: 2026-06-11 -- v1.8 closed; Phase 39 deferred to v1.9
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Current Position

Milestone v1.8 complete (Phases 37 + 38 shipped). Phase 39 deferred.

Ready to plan v1.9.

## v1.8 Outcome

- Phase 37: Tech debt + RSC auth guard ✅
- Phase 38: Atomic approval trigger + verification badge ✅
- Phase 38 review fixes: 7 code review findings fixed (CR-01..WR-04) ✅
- Phase 39: DEFERRED — business/consumer UX patches skipped in favour of a full architectural redesign in v1.9

## v1.9 Direction

**Core decision (2026-06-11):** Business and consumer sides should be fully separated applications with distinct login flows. The current architecture (same Supabase Auth, role via `business_accounts` table) was a v1.7 pragmatic choice. v1.9 will redesign this properly.

Key open questions for v1.9 planning:
- Separate Supabase Auth users for business vs consumer, or same auth with hard UI separation?
- Does `/` ever show content to business-account users, or is it consumer-only?
- What happens to existing business accounts registered under the current single-auth model?
- BIZUX-02, BIZUX-03, BIZUX-04, BIZUX-05 all fold into this redesign

## Active Decisions (carried forward)

- URL routing: `/` and `/?nakyma=kartta` both render Etusivu — `?nakyma=kartta` is a dead parameter
- GPS: client-side only, never URL params
- AI widget: never SSR, use `/api/saasuositus` Route Handler
- Supabase writes: service role key only; anon key is read-only after RLS
- Storage RLS: SECURITY DEFINER function in public schema (storage schema forbidden)
- JWT verification: supabaseAdmin.auth.getUser(token) at every Route Handler boundary
- Admin approval: required for initial registration; edits after approval are instant
- Middleware: never query DB from middleware (Edge Runtime); use RSC layout for auth checks

## Session Continuity

Last session: 2026-06-11
Stopped at: v1.8 closed; ready for /gsd:new-milestone v1.9
