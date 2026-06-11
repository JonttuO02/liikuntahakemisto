# Requirements — v1.8 Yritysportaali v2 — Julkistaminen & UX

**Milestone:** v1.8
**Status:** Active
**Defined:** 2026-06-11

## Overview

Kolme teemaa: (1) v1.7 tech debt siivotaan — data-integriteetti- ja turvallisuusaukot korjataan ennen uusia ominaisuuksia; (2) yritysprofiilien julkistaminen — admin-hyväksynnän jälkeen paikka tulee julkiseksi ja business-data ylikirjoittaa Google Places -datan, verifikaatio-tikki kaikissa korteissa; (3) erillinen business-käyttäjäkokemus — dashboard-etusivu, stripped karttanäkymä, profiilin siivous.

---

## v1.8 Requirements

### Tech Debt (DEBT)

- [ ] **DEBT-01**: Yritys-wizard (OnboardingWizardInner + EditWizardInner) ei enää sisällä auth useEffect -logiikkaa — business/layout.tsx RSC guard hoitaa suojauksen
- [ ] **DEBT-02**: claim-paikka-reitti asettaa `business_managed=true` liikuntapaikat-tauluun claim-hetkellä
- [ ] **DEBT-03**: middleware.ts suojaa `/admin`- ja `/business`-reitit kirjautumattomalta käyttäjältä session-tarkistuksella (ei DB-kyselyä)
- [ ] **DEBT-04**: `onboarding_completed`-kolumni poistetaan business_accounts-taulusta (tai kolumnin kirjoitukset poistetaan)
- [ ] **DEBT-05**: onboarding/submit-reitin draft-delete-kutsu scopettuu `paikka_id`:llä multi-venue-turvallisuuden vuoksi

### Julkistaminen (PUB)

- [ ] **PUB-01**: Admin-hyväksyntä asettaa `published=true` JA `business_managed=true` atomisesti kaikille venue-tyypeille (claim + created) — Postgres-triggeri business_paikka_links AFTER UPDATE
- [ ] **PUB-02**: `Liikuntapaikka`-tyyppi (lib/types.ts) sisältää `is_claimed`- ja `business_managed`-kentät
- [ ] **PUB-03**: app/page.tsx SELECT hakee `is_claimed`- ja `business_managed`-kentät kaikilta paikoilta
- [ ] **PUB-04**: Verifikaatio-tikki (checkmark) näytetään paikan nimen vieressä PaikkaKortissa, DiagonaalKortissa ja PaikkaSheetissä kun `business_managed=true`

### Business User UX (BIZUX)

- [ ] **BIZUX-01**: `app/business/layout.tsx` on async Server Component auth guard — kaikki `/business/*`-reitit suojattu palvelinpuolella ilman client-side `useEffect`-tarkistuksia
- [ ] **BIZUX-02**: Kirjautunut yritysprofiili ohjataan `/business`-dashboardille kun käyttäjä lataa etusivun `/`
- [ ] **BIZUX-03**: `/business`-dashboard-etusivu näyttää paikkojen tilabadget (approved/pending/rejected), "Avaa kartta" -napin ja pikaohjaukset muokkaus- ja esikatselutoimintoihin
- [ ] **BIZUX-04**: `/business/map` on erillinen karttareitti ilman consumer-featureja (ei bottomsheet, ei AI-widget, ei säätieto, ei TODO-overlay)
- [ ] **BIZUX-05**: `/profiili`-sivu piilottaa kiinnostuksenkohteet- ja kotipaikkakunta-osiot yritysprofiilille

---

## Future Requirements (deferred)

- Yrityksen sähköposti-ilmoitus kun paikka menee julkiseksi (hyväksyntä → "Paikkasi on nyt julkinen")
- Analytics/metrics business-dashboardille (kävijät, klikkaukset — ei dataa vielä v1.8:ssa)
- Paid upgrade / sponsored-paketti yrityksille
- Ketjuadmin (yksi tili, useita toimipisteitä eri omistajilla)
- Lisäkielet (ruotsi, auto-detection) — i18n-laajennus
- Suosikkipaikat-sivu kuluttajalle (/suosikit)
- Kartta: etäisyyspohjainen suodatus

---

## Out of Scope

- Varausjärjestelmä — linkitetään palveluntarjoajan omaan sivuun
- Reaaliaikainen paikkatieto (kapasiteetti, jonot)
- Mobiiliappi (iOS/Android)
- Maksujärjestelmä sovelluksessa
- JWT Custom Access Token Hook — DB-lookup on riittävä ja projektin vakiintunut patterni

---

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| DEBT-01 | Phase 37 | — |
| DEBT-02 | Phase 37 | — |
| DEBT-03 | Phase 37 | — |
| DEBT-04 | Phase 37 | — |
| DEBT-05 | Phase 37 | — |
| BIZUX-01 | Phase 37 | — |
| PUB-01 | Phase 38 | — |
| PUB-02 | Phase 38 | — |
| PUB-03 | Phase 38 | — |
| PUB-04 | Phase 38 | — |
| BIZUX-02 | Phase 39 | — |
| BIZUX-03 | Phase 39 | — |
| BIZUX-04 | Phase 39 | — |
| BIZUX-05 | Phase 39 | — |
