---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Business UX & Navigation
status: complete
stopped_at: Phase 43 complete — all 3 plans executed and smoke-tested
last_updated: "2026-06-15T12:00:00.000Z"
last_activity: 2026-06-15 — phase 43 executed (43-01 migration, 43-02 i18n, 43-03 RSC+client — all verified)
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 7
  completed_plans: 7
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-12)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v2.0 Business UX & Navigation — Phase 41 planned, ready to execute

## Current Position

Phase: 43 — complete ✓
Status: v2.0 milestone complete. All 3 phases (41–43) executed and verified.
Last activity: 2026-06-15 — phase 43 executed (43-01 migration + push, 43-02 i18n keys, 43-03 RSC page + client — smoke-tested)

Progress: ██████████ 100% (3/3 phases complete; 7/7 total plans complete)

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

Last session: 2026-06-15T10:00:00.000Z
Stopped at: Phase 43 planned (3 plans verified)
Resume file: .planning/phases/43-business-profile/43-01-PLAN.md
