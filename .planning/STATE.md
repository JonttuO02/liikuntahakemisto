---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Business UX & Navigation
status: executing
last_updated: "2026-06-12T13:15:00Z"
last_activity: 2026-06-12 — Phase 42 wave 1 complete (42-01 dashboard redesign done)
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 4
  completed_plans: 3
  percent: 50
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-12)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v2.0 Business UX & Navigation — Phase 41 planned, ready to execute

## Current Position

Phase: 42 (Dashboard & Map) — executing wave 2
Status: Wave 1 complete (42-01 dashboard redesign done). Wave 2 in progress (42-02 /business/map).
Last activity: 2026-06-12 — 42-01 dashboard redesign merged; StatusCard + VenueRow + map CTA live

Progress: ████░░░░░░ 50% (0/3 phases, 1/2 plans)

## v2.0 Direction

**Core decision (2026-06-12):** Build a complete, self-contained business user interface. BusinessNav replaces consumer NavBar on all `/business/*` routes. Business users have their own dashboard, map, and profile page — entirely separate from the consumer experience. Auth sessions remain fully isolated (v1.9 sb-biz-* architecture).

- Phases 41–43: v2.0 milestone
- Phase 41 unblocks Phase 42 and Phase 43 (nav shell must exist first)
- BIZUX-05 (hide /profiili fields for business users) dropped — business users navigate to /business/profiili instead

## Active Decisions (carried forward)

- URL routing: `/` ja `/?nakyma=kartta` molemmat renderöivät Etusivun — `?nakyma=kartta` on kuollut parametri
- GPS: client-side only, never URL params
- AI widget: never SSR, use `/api/saasuositus` Route Handler
- Supabase writes: service role key only; anon key is read-only after RLS
- Storage RLS: SECURITY DEFINER function in public schema (storage schema forbidden)
- JWT verification: supabaseAdmin.auth.getUser(token) at every Route Handler boundary
- Middleware: never query DB from middleware (Edge Runtime); use RSC layout for auth checks
- **v1.9**: Business routes use `sb-biz-*` cookie namespace; consumer routes use default `sb-*`
- **v1.9**: `createBusinessServerClient()` and `createBusinessBrowserClient()` in `lib/supabase-business.ts`
- **v1.9**: Single `WizardInner` component (mode: 'onboarding' | 'edit')
- **v2.0**: /business/map is a NEW standalone route — does NOT modify Etusivu.tsx
- **v2.0**: Consumer /profiili page is NOT touched — business users navigate to /business/profiili

## Accumulated Context

### Decisions

- Phase 40: WizardInner yhdistetty yhdeksi tiedostoksi — OnboardingMode ja EditMode private sub-komponentteina
- Phase 38: Admin-hyväksyntä julkaisee paikan atomisesti Postgres-triggerillä (published=true + business_managed=true yhdessä transaktiossa)
- Phase 37: Middleware ei tee DB-kyselyitä — auth-tarkistukset RSC layout-komponenteissa
- v2.0: Business users navigate to /business/profiili — consumer /profiili unchanged and not visited by business users
- v2.0: BusinessNav rendered inside app/business/layout.tsx (already an RSC guard) — consumer NavBar suppressed at layout level

### Pending Todos

- CLEAN-01: DONE — supabase db push ajettu 2026-06-12 (testitilit poistettu)

### Blockers/Concerns

- CR-01: `app/business/[id]/page.tsx` lukee paikan tiedot ilman omistajuustarkistusta (pre-existing issue)
- CR-02: `app/api/business/onboarding/submit/route.ts` ei filtteroi `paikka_id`:llä (pre-existing issue)

## Session Continuity

Last session: 2026-06-12T10:00:25.643Z
Stopped at: context exhaustion at 82% (2026-06-12)
Resume file: None
