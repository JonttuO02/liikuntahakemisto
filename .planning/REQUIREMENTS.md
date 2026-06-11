# Requirements — v1.9 Auth-Separaatio & Cleanup

**Milestone:** v1.9
**Status:** Active
**Defined:** 2026-06-11

## Overview

Kaksi teemaa: (1) Consumer- ja business-puolen auth-sessiot eriytetään täysin toisistaan cookie-nimiavaruuksilla — `/business/*`-reitit saavat oman `sb-biz-*`-cookien, consumer-puoli käyttää normaalia `sb-*`-cookiea, sessiot ovat täysin riippumattomia; (2) v1.7–v1.8 tech debt siistitään — wizard-duplikaattien yhdistäminen, update-paikka API-bugi, step-skip-bypass, onboarding_completed kuollut koodi ja testitilit.

---

## v1.9 Requirements

### Auth Session Separation (AUTHSEP)

- [ ] **AUTHSEP-01**: Luodaan `lib/supabase-business.ts` joka eksportoi `createBusinessServerClient()` ja `createBusinessBrowserClient()` — molemmat käyttävät `sb-biz-*`-cookie-nimiavaruutta (erillinen `cookieName`-konfiguraatio)
- [ ] **AUTHSEP-02**: Kaikki `/business/*`-sivut ja `/api/business/*`-reitit käyttävät `createBusinessServerClient()`-helpperiä — consumer-sessio (`sb-*`-cookie) ei vaikuta niihin
- [ ] **AUTHSEP-03**: `/api/admin/*`-reitit käyttävät `createBusinessServerClient()`-helpperiä (admin on business-puolta) — consumer-sessio ei vaikuta niihin
- [ ] **AUTHSEP-04**: Consumer-sivut ja `/api/*`-reitit (pl. `/api/business/*` ja `/api/admin/*`) käyttävät oletussessio-cookieta — business-sessio (`sb-biz-*`) ei vaikuta niihin
- [ ] **AUTHSEP-05**: `middleware.ts` refreshaa `/business/*`-reiteillä business-session ja muilla reiteillä consumer-session — session refresh ei vaikuta väärään cookie-nimiavaruuteen
- [ ] **AUTHSEP-06**: `/business/kirjaudu` (business login) käyttää business-asiakasta — token tallennetaan `sb-biz-*`-cookieen, ei consumer-cookieen
- [ ] **AUTHSEP-07**: Käyttäjä voi olla samanaikaisesti kirjautuneena consumer-tilillä (`/`) ja business-tilillä (`/business`) — sessiot ovat toisistaan riippumattomia

### Cleanup (CLEAN)

- [ ] **CLEAN-01**: Vanhat testitilit poistetaan — `business_accounts`-taulun testitiedot ja vastaavat `auth.users`-rivit poistetaan Supabase Dashboardista tai migraatiolla
- [ ] **CLEAN-02**: `OnboardingWizardInner` ja `EditWizardInner` yhdistetään yhdeksi `WizardInner`-komponentiksi joka hyväksyy `mode: 'onboarding' | 'edit'` prop — duplikoitu draft-fetch-, step-routing-, `paikka_id`-URL-hallinta- ja guard-logiikka poistetaan
- [ ] **CLEAN-03**: `POST /api/business/update-paikka` hyväksyy muokkaukset kaikille yrityksen linkitetyille paikoille `claim_status`-arvosta riippumatta (pending, approved, rejected) — nykyinen `approved`-only-rajoitus poistetaan
- [ ] **CLEAN-04**: Onboarding-velhoon lisätään step-forward-suoja: `?step=N`-URL-parametri ei voi hypätä ohi tekemättömien vaiheiden (`current_step + 1` on maksimi sallittu askel)
- [ ] **CLEAN-05**: `onboarding_completed`-kolumnin kirjoitukset poistetaan `/api/business/onboarding/submit`-reitistä (kuollut koodi — kolumni kirjoitetaan mutta sitä ei koskaan lueta)

---

## Future Requirements (deferred)

- BIZUX-02: Kirjautunut yritysprofiili ohjataan `/business`-dashboardille — deferred (ei tarvita auth-eristyksen myötä)
- BIZUX-03: `/business`-dashboard-etusivu tilabadgeillä ja pikaohjauksineen — deferred
- BIZUX-04: `/business/map` erillinen karttareitti ilman consumer-featureja — deferred
- BIZUX-05: `/profiili` piilottaa consumer-kentät yritysprofiilille — deferred
- Yrityksen sähköposti-ilmoitus paikan julkaisusta
- Analytics/metrics business-dashboardille
- Paid upgrade / sponsored-paketti yrityksille
- Ketjuadmin (yksi tili, useita toimipisteitä)
- Lisäkielet (ruotsi, auto-detection)
- Suosikkipaikat-sivu kuluttajalle (/suosikit)
- Kartta: etäisyyspohjainen suodatus

---

## Out of Scope

- Varausjärjestelmä — linkitetään palveluntarjoajan omaan sivuun
- Reaaliaikainen paikkatieto (kapasiteetti, jonot)
- Mobiiliappi (iOS/Android)
- Maksujärjestelmä sovelluksessa
- JWT Custom Access Token Hook — DB-lookup on riittävä ja projektin vakiintunut patterni
- Kaksi erillistä Supabase-projektia — yksi projekti, kaksi cookie-nimiavaruutta riittää

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| AUTHSEP-01 | Phase 39 | Pending |
| AUTHSEP-02 | Phase 39 | Pending |
| AUTHSEP-03 | Phase 39 | Pending |
| AUTHSEP-04 | Phase 39 | Pending |
| AUTHSEP-05 | Phase 39 | Pending |
| AUTHSEP-06 | Phase 39 | Pending |
| AUTHSEP-07 | Phase 39 | Pending |
| CLEAN-01 | Phase 40 | Pending |
| CLEAN-02 | Phase 40 | Pending |
| CLEAN-03 | Phase 40 | Pending |
| CLEAN-04 | Phase 40 | Pending |
| CLEAN-05 | Phase 40 | Pending |
