---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: AI-pohjainen yrityssivuanalyysi
status: planning
stopped_at: Milestone v2.1 started — defining roadmap
last_updated: "2026-06-15T12:00:00.000Z"
last_activity: 2026-06-15 — milestone v2.1 started, requirements defined (13 reqs)
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-15)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v2.1 AI-pohjainen yrityssivuanalyysi — defining roadmap

## Current Position

Phase: Not started (defining roadmap)
Plan: —
Status: Defining roadmap
Last activity: 2026-06-15 — Milestone v2.1 started

## v2.1 Direction

**Core decision (2026-06-15):** Business-käyttäjä syöttää onboardingissa verkkosivunsa URL:n. Sovellus hakee HTML:n `fetch`:llä (ei Playwrightia), poimii brändivärit CSS-muuttujista ja `theme-color`-metasta, kerää logo-kandidaatit, ja lähettää ne Claudelle yhdessä API-kutsussa (vision + teksti). Claude palauttaa logon, värit, hinnaston ja aukioloajat JSON:na. Tulokset esitäytetään onboarding-velhoon uuden pre-vaiheen kautta.

- Ei Playwrightia — `fetch` + CSS-parsinta + Claude vision
- Pre-vaihe ennen WizardInneria: URL → analyysi → esikatselu → jatka velhoon
- Esikatselu (step 6) käyttää brändidataa, kuluttajapuoli ei muutu tässä milestonessa
- FK: `business_accounts` (ei `businesses`)
- `brandianalyysi-toteutusohje.md` projektijuuressa — Playwright-osuudet korvattu

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
- **v2.1**: No Playwright — `fetch` only; Framer/SPA fallback is manual entry
- **v2.1**: `business_branding` FK references `business_accounts`, not `businesses`

## Accumulated Context

### Decisions

- Phase 40: WizardInner yhdistetty yhdeksi tiedostoksi — OnboardingMode ja EditMode private sub-komponentteina
- Phase 38: Admin-hyväksyntä julkaisee paikan atomisesti Postgres-triggerillä (published=true + business_managed=true yhdessä transaktiossa)
- Phase 37: Middleware ei tee DB-kyselyitä — auth-tarkistukset RSC layout-komponenteissa
- v2.0: Business users navigate to /business/profiili — consumer /profiili unchanged and not visited by business users
- v2.0: BusinessNav rendered inside app/business/layout.tsx (already an RSC guard) — consumer NavBar suppressed at layout level

### Pending Todos

- CR-01: `app/business/[id]/page.tsx` lukee paikan tiedot ilman omistajuustarkistusta (pre-existing issue)
- CR-02: `app/api/business/onboarding/submit/route.ts` ei filtteroi `paikka_id`:llä (pre-existing issue)

## Session Continuity

Last session: 2026-06-15T12:00:00.000Z
Stopped at: v2.1 milestone requirements defined — roadmap pending
Resume file: .planning/ROADMAP.md (once created)
