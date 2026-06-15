---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: AI-pohjainen yrityssivuanalyysi
status: in progress
stopped_at: Phase 45 planned — 4 plans ready to execute
last_updated: "2026-06-15T16:00:00.000Z"
last_activity: 2026-06-15 — Phase 45 planned (4 plans: foundation, scraper, analyzer+storage, route handler)
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 5
  completed_plans: 1
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-06-15)

**Core value:** Löydät läheltäsi minkä tahansa liikuntapalvelun, näet hinnan ja aukioloajat, ja pääset liikkumaan — ilman hakua, ilman kirjautumista.
**Current focus:** v2.1 AI-pohjainen yrityssivuanalyysi — Phase 44 next

## Current Position

Phase: 45 — Scraper & Claude API -putki (Ready to execute)
Plan: 4 plans across 4 waves (45-01 → 45-02 → 45-03 → 45-04)
Status: Phase 45 planned — ready to execute
Last activity: 2026-06-15 — Phase 45 planned (scraper, Claude vision, Storage upload, waitUntil route)

## v2.1 Direction

**Core decision (2026-06-15):** Business-käyttäjä syöttää onboardingissa verkkosivunsa URL:n. Sovellus hakee HTML:n `fetch`:llä (ei Playwrightia), poimii brändivärit CSS-muuttujista ja `theme-color`-metasta, kerää logo-kandidaatit, ja lähettää ne Claudelle yhdessä API-kutsussa (vision + teksti). Claude palauttaa logon, värit, hinnaston ja aukioloajat JSON:na. Tulokset esitäytetään onboarding-velhoon uuden pre-vaiheen kautta.

- Ei Playwrightia — `fetch` + CSS-parsinta + Claude vision
- Pre-vaihe ennen WizardInneria: URL → analyysi → esikatselu → jatka velhoon
- Esikatselu (step 6) käyttää brändidataa, kuluttajapuoli ei muutu tässä milestonessa
- FK: `business_accounts` (ei `businesses`)
- `brandianalyysi-toteutusohje.md` projektijuuressa — Playwright-osuudet korvattu

## v2.1 Roadmap

| Phase | Name | Requirements | Status |
|-------|------|--------------|--------|
| 44 | Brändidatan tietokantaperusta | BRDDB-01, BRDDB-02 | Not started |
| 45 | Scraper & Claude API -putki | SCRAP-01–05 | Not started |
| 46 | Pre-vaihe UI & velhointegraatio | ONBOARD-08–13, PREV-01 | Not started |

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
- **v2.1**: One Claude API call per analysis (vision + text in same message)

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

Last session: 2026-06-15T13:00:00.000Z
Stopped at: Phase 44 context gathered
Resume file: .planning/phases/44-brandidata-tietokantaperusta/44-CONTEXT.md
