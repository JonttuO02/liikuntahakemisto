# ROADMAP — Liikuntahakemisto

## Milestones

- ✅ **v1.0 MVP** — Phases 1–5 (shipped 2026-05-21)
- ✅ **v1.1 Käyttäjät, Kartta & Laatu** — Phases 6–11 (shipped 2026-05-27)
- ✅ **v1.2 UI-uudistus & Arvostelut** — Phases 12–15 (shipped 2026-05-28)
- ✅ **v1.3 AKTIIVI — Redesign & Polish** — Phases 16–18 (shipped 2026-05-30)
- ✅ **v1.4 UX-parannukset & Profiili** — Phases 19–22 (shipped 2026-05-31)
- ✅ **v1.5 Visuaalinen elävöitys & UX-hienosäätö** — Phases 23–26 (shipped 2026-06-02)
- ✅ **v1.6 Kielituki, Ikonit & Sheet-redesign** — Phases 27–30 (shipped 2026-06-04)
- ✅ **v1.7 Yritysportaali** — Phases 31–36 (shipped 2026-06-11)
- ✅ **v1.8 Yritysportaali v2 — Julkistaminen & UX** — Phases 37–38 (shipped 2026-06-11)
- 🚧 **v1.9 Auth-Separaatio & Cleanup** — Phases 39–40 (in progress)

---

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–5) — SHIPPED 2026-05-21</summary>

- [x] **Phase 1: Foundation & Security** — Fix critical bugs, lock down APIs, migrate schema (14/14 plans) — 2026-05-19
- [x] **Phase 2: Map & GPS** — Complete map UX with real GPS and distance display (3/3 plans) — 2026-05-21
- [x] **Phase 3: Data Enrichment** — Opening hours, multi-sport coverage, manual pricing (2/2 plans) — 2026-05-21
- [x] **Phase 4: Service Information UI** — Surface enriched data on cards and detail pages (4/4 plans) — 2026-05-21
- [x] **Phase 5: AI Weather Widget** — Differentiating AI recommendation feature (2/2 plans) — 2026-05-21

Full archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

<details>
<summary>✅ v1.1 Käyttäjät, Kartta & Laatu (Phases 6–11) — SHIPPED 2026-05-27</summary>

- [x] **Phase 6: UI Polish & Data Foundation** — Tighten card UI, add GDPR page, sponsored badge, city filter, AI widget city name (7/7 plans) — 2026-05-22
- [x] **Phase 7: Map Infrastructure** — Migrate to AdvancedMarker, add mapId env var, implement re-center button (2/2 plans) — 2026-05-22
- [x] **Phase 8: Map Features** — GPS accuracy ring, zoom-dependent pin-to-card, in-app map focus; Etusivu refactored to bottom sheet architecture (3/3 plans) — 2026-05-22
- [x] **Phase 9: Auth & Favorites** — Supabase Auth (email + Google OAuth), favorites synced across devices, personalized AI (4/4 plans) — 2026-05-23
- [x] **Phase 10: City Expansion** — Helsinki and Turku data via Google Places sync (4/4 plans) — 2026-05-27
- [x] **Phase 11: PWA** — Service worker with offline support and home screen install prompt (3/3 plans) — 2026-05-27

Full archive: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 UI-uudistus & Arvostelut (Phases 12–15) — SHIPPED 2026-05-28</summary>

- [x] **Phase 12: Haku & korttilistaus etusivulle** — Search overlay + real-time card list in Etusivu; remove LiikuntapaikatLista and /?nakyma=lista (3/3 plans) — 2026-05-27
- [x] **Phase 13: Uusi korttimalli** — DiagonaalKortti with clip-path diagonal split + Google Static Maps thumbnail (2/2 plans) — 2026-05-28
- [x] **Phase 14: Profiilisivu & AI-kotipaikkakunta** — /profiili page, profiles table, kotikaupunki persistence, buildReissuKonteksti AI context (5/5 plans) — 2026-05-28
- [x] **Phase 15: Arvostelut** — reviews table + RLS, StarPicker, ReviewForm (upsert max 1/user/place), ReviewSection on venue page (4/4 plans) — 2026-05-28

Full archive: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>✅ v1.3 AKTIIVI — Redesign & Polish (Phases 16–18) — SHIPPED 2026-05-30</summary>

- [x] **Phase 16: Brändi & Logo-uloke** — Rebrand to AKTIIVI, animated SVG logo watermark in bottom sheet (4/4 plans) — 2026-05-29
- [x] **Phase 17: Toolbar & Haku-UX** — Unified search+filter pill, separate LayoutList toggle (1/1 plan) — 2026-05-29
- [x] **Phase 18: Kartan pinnit & korttianimaatio** — Unified red pins with sport SVG icons, same-address clustering, CalloutCard + PaikkaSheet layoutId expansion (3/3 plans) — 2026-05-30

Full archive: `.planning/milestones/v1.3-ROADMAP.md`

</details>

<details>
<summary>✅ v1.4 UX-parannukset & Profiili (Phases 19–22) — SHIPPED 2026-05-31</summary>

- [x] **Phase 19: Filtteri, lista & paikka-UX** — Kertakäynti-filtteri, paikka kuva listakortissa, AI-widget tila, pin-nappi listakortissa, image_url Supabaseen (3/3 plans) — 2026-05-30
- [x] **Phase 20: Navigaatio-korjaukset** — Back-scroll, "Näytä kartalla" paikan koordinaatit, bottomsheet-avausanimaatio, toolbar-cleanup (2/2 plans) — 2026-05-30
- [x] **Phase 21: TO DO -lista** — Suosikit → TO DO, sydän → kirjanmerkki, /suosikit toimiva TO DO -lista (2/2 plans) — 2026-05-31
- [x] **Phase 22: Profiili & AI-kiinnostukset** — Kiinnostuksen kohteet monivalintana profiiliin, käytetään AI-suosituksissa (4/4 plans) — 2026-05-31

Full archive: `.planning/milestones/v1.4-ROADMAP.md`

</details>

<details>
<summary>✅ v1.5 Visuaalinen elävöitys & UX-hienosäätö (Phases 23–26) — SHIPPED 2026-06-02</summary>

- [x] **Phase 23: Visuaalinen perusta** — Outfit-fontti, AktiiviLogo sweep-animaatio, SportPin sininen liukuväri + orbit-kiilto, klusteripinnit (4/4 plans) — 2026-06-01
- [x] **Phase 24: Callout-kortti & ikonit** — CalloutCard 160px, pystysuuntainen layout, kirjain kerrallaan animaatio, laji-avatar (1/1 plan) — 2026-06-02
- [x] **Phase 25: TO DO overlay** — Overlay etusivulle, scale-animaatio, stagger-lista, "Kävikö paikassa?" → inline arvostelu (2/2 plans) — 2026-06-02
- [x] **Phase 26: Filtterit** — Dead state poistettu, searchLaji string[], FilterCarouselPill karuselli-animaatiolla (2/2 plans) — 2026-06-02

Full archive: `.planning/milestones/v1.5-ROADMAP.md`

</details>

<details>
<summary>✅ v1.6 Kielituki, Ikonit & Sheet-redesign (Phases 27–30) — SHIPPED 2026-06-04</summary>

- [x] **Phase 27: Siivous & pienet korjaukset** — Navigaatiosiivous, filtteri/haku-korjaukset, sheet-korjaukset, klusterizoomi ja UI-häivytys *(5/5 plans)* — 2026-06-03
- [x] **Phase 28: SVG-ikonit** — Uusi lib/sportIcons.tsx -rekisteri, ikonit käytössä kaikkialla (prerequisite for i18n) *(2/2 plans)* — 2026-06-03
- [x] **Phase 29: Kortit & sheet redesign** — PaikkaSheet hero-karuselli + hinnasto, PaikkaKortti hinnastokaruselli, DiagonaalKortti placeholder-kuvat *(4/4 plans)* — 2026-06-04
- [x] **Phase 30: i18n FI/EN** — next-intl, NEXT_LOCALE-cookie, kielivalitsin profiilisivulla, kaikki UI-tekstit käännetty *(4/4 plans)* — 2026-06-04

Full archive: `.planning/milestones/v1.6-ROADMAP.md`

</details>

<details>
<summary>✅ v1.7 Yritysportaali (Phases 31–36) — SHIPPED 2026-06-11</summary>

- [x] **Phase 31: DB-skeema & Storage-perusta** — business_accounts, business_paikka_links, business_managed, business-media bucket ja RLS (4/4 plans) — 2026-06-05
- [x] **Phase 32: Yritysrekisteröinti & auth** — Rekisteröintilomake, kirjautuminen, automaattinen ohjaus /business-sivulle (3/3 plans) — 2026-06-05
- [x] **Phase 33: Claim & paikan luonti** — Olemassa olevan paikan haku + claim-pyynti; uuden paikan luonti; näkyvyysäännöt (7/7 plans) — 2026-06-06
- [x] **Phase 34: Onboarding-velhou** — 6-vaiheinen ohjattu wizard (12/12 plans) — 2026-06-10
- [x] **Phase 35: Admin-hyväksyntäjärjestelmä** — Email-ilmoitukset, /admin-sivu, hyväksy/hylkää, is_admin-suojaus (11/11 plans) — 2026-06-10
- [x] **Phase 36: Hallintapaneeli** — /business-sivu: paikkalistaus tiloineen, kaikkien tietojen muokkaus, esikatselu (7/7 plans) — 2026-06-10

Full archive: `.planning/milestones/v1.7-ROADMAP.md`

</details>

<details>
<summary>✅ v1.8 Yritysportaali v2 — Julkistaminen & UX (Phases 37–38) — SHIPPED 2026-06-11</summary>

- [x] **Phase 37: Tech Debt Foundation** — Data-integriteetti ja turvallisuusaukot korjataan; RSC guard kaikille /business-reiteille *(6 plans, Wave 1×4 + Wave 2×2)* (completed 2026-06-11)
- [x] **Phase 38: Business Data Publication** — Postgres-triggeri atomiselle hyväksynnälle; verifikaatio-tikki kaikissa korteissa *(3 plans, Wave 1×2 + Wave 2×1)* (completed 2026-06-11)
- [~] **Phase 39 (original): Business User UX** — DEFERRED. Business/consumer separation requires full architectural redesign (auth separation) — scope moved to v1.9 AUTHSEP requirements.

</details>

---

### 🚧 v1.9 Auth-Separaatio & Cleanup (Phases 39–40)

**Milestone Goal:** Consumer- ja business-puolen auth-sessiot eriytetään täysin toisistaan cookie-nimiavaruuksilla, ja v1.7–v1.8 tech debt siistitään — wizard-duplikaattien yhdistäminen, API-bugifixit, kuollut koodi ja testitilit.

- [ ] **Phase 39: Auth-Separaatio** — Eriytetyt auth-sessiot: sb-biz-* business-puolelle, sb-* consumer-puolelle; simultaanisessiot mahdollisia *(4 plans, Wave 1×1 + Wave 2×2 + Wave 3×1)*
- [ ] **Phase 40: Wizard-konsolidointi & Cleanup** — WizardInner-yhdistäminen, update-paikka 403 -bugikorjaus, step-skip-suoja, kuollut koodi ja testitilit poistetaan

## Phase Details

### Phase 39: Auth-Separaatio
**Goal**: Consumer- ja business-puolen auth-sessiot ovat täysin toisistaan riippumattomia — business-reitit käyttävät sb-biz-*-cookieta, consumer-reitit käyttävät normaalia sb-*-cookieta, ja molemmat voivat olla aktiivisina samanaikaisesti
**Depends on**: Phase 38 (v1.8 complete)
**Requirements**: AUTHSEP-01, AUTHSEP-02, AUTHSEP-03, AUTHSEP-04, AUTHSEP-05, AUTHSEP-06, AUTHSEP-07
**Success Criteria** (what must be TRUE):
  1. Kirjautuminen `/business/kirjaudu`-sivulla asettaa `sb-biz-*`-cookien — `sb-*`-consumer-cookie ei muutu eikä nollaudu
  2. Consumer-sivulle kirjautunut käyttäjä voi samanaikaisesti olla kirjautuneena business-puolelle eri tunnuksilla — molemmat sessiot pysyvät voimassa selainistunnon ajan
  3. Kirjautumaton consumer-käyttäjä, joka navigoi `/business`-reiteille, ohjataan business-kirjautumissivulle — consumer-sessio ei vaikuta tähän tarkistukseen
  4. Kirjautunut business-käyttäjä, joka navigoi consumer-reiteille (`/`, `/profiili`), näkee sivun normaalisti ilman business-session häiriötä — consumer-auth toimii omalla sb-*-cookiellaan
  5. Middleware refreshaa oikean session oikealla reitillä: `/business/*`-reiteillä refreshataan sb-biz-*-cookie, muilla reiteillä refreshataan sb-*-cookie
**Plans**: 4 plans (Wave 1 + Wave 2×2 + Wave 3)
Plans:
- [ ] 39-01-PLAN.md — Create lib/supabase-business.ts (sb-biz-* namespace clients)
- [ ] 39-02-PLAN.md — Middleware path-conditional refresh + i18n strings
- [ ] 39-03-PLAN.md — /business/kirjaudu login page
- [ ] 39-04-PLAN.md — Migrate all /business/* pages to business client

### Phase 40: Wizard-konsolidointi & Cleanup
**Goal**: Wizard-duplikaatti poistetaan, API-bugit korjataan ja kuollut koodi siistitään — codebase on tiiviimpi ja business-käyttäjä voi muokata kaikkia paikkojaan riippumatta claim-statuksesta
**Depends on**: Phase 39
**Requirements**: CLEAN-01, CLEAN-02, CLEAN-03, CLEAN-04, CLEAN-05
**Success Criteria** (what must be TRUE):
  1. Onboarding- ja edit-velhouissa on yksi yhteinen `WizardInner`-komponentti joka hyväksyy `mode: 'onboarding' | 'edit'` — erilliset `OnboardingWizardInner` ja `EditWizardInner` on poistettu koodikannasta
  2. Yritys pystyy muokkaamaan paikkansa tietoja hallintapaneelista riippumatta siitä onko paikan `claim_status` pending, approved vai rejected — 403-virhe ei enää tule muokkauksesta
  3. Onboarding-velhoussa `?step=N`-URL-parametri ei voi hypätä ohi tekemättömien vaiheiden — suoraan `?step=4`-osoitteeseen menevä käyttäjä ohjataan ensimmäiseen tekemättömään vaiheeseen
  4. `/api/business/onboarding/submit`-reitti ei enää kirjoita `onboarding_completed`-kolumniin — kolumni ei vaikuta mihinkään routing-päätökseen
  5. Supabase Dashboardissa ei ole testitili-rivejä `business_accounts`- eikä `auth.users`-tauluissa
**Plans**: TBD

---

## Progress Table

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Security | v1.0 | 14/14 | Complete | 2026-05-19 |
| 2. Map & GPS | v1.0 | 3/3 | Complete | 2026-05-21 |
| 3. Data Enrichment | v1.0 | 2/2 | Complete | 2026-05-21 |
| 4. Service Information UI | v1.0 | 4/4 | Complete | 2026-05-21 |
| 5. AI Weather Widget | v1.0 | 2/2 | Complete | 2026-05-21 |
| 6. UI Polish & Data Foundation | v1.1 | 7/7 | Complete | 2026-05-22 |
| 7. Map Infrastructure | v1.1 | 2/2 | Complete | 2026-05-22 |
| 8. Map Features | v1.1 | 3/3 | Complete | 2026-05-22 |
| 9. Auth & Favorites | v1.1 | 4/4 | Complete | 2026-05-23 |
| 10. City Expansion | v1.1 | 4/4 | Complete | 2026-05-27 |
| 11. PWA | v1.1 | 3/3 | Complete | 2026-05-27 |
| 12. Haku & korttilistaus etusivulle | v1.2 | 3/3 | Complete | 2026-05-27 |
| 13. Uusi korttimalli | v1.2 | 2/2 | Complete | 2026-05-28 |
| 14. Profiilisivu & AI-kotipaikkakunta | v1.2 | 5/5 | Complete | 2026-05-28 |
| 15. Arvostelut | v1.2 | 4/4 | Complete | 2026-05-28 |
| 16. Brändi & Logo-uloke | v1.3 | 4/4 | Complete | 2026-05-29 |
| 17. Toolbar & Haku-UX | v1.3 | 1/1 | Complete | 2026-05-29 |
| 18. Kartan pinnit & korttianimaatio | v1.3 | 3/3 | Complete | 2026-05-30 |
| 19. Filtteri, lista & paikka-UX | v1.4 | 3/3 | Complete | 2026-05-30 |
| 20. Navigaatio-korjaukset | v1.4 | 2/2 | Complete | 2026-05-30 |
| 21. TO DO -lista | v1.4 | 2/2 | Complete | 2026-05-31 |
| 22. Profiili & AI-kiinnostukset | v1.4 | 4/4 | Complete | 2026-05-31 |
| 23. Visuaalinen perusta | v1.5 | 4/4 | Complete | 2026-06-01 |
| 24. Callout-kortti & ikonit | v1.5 | 1/1 | Complete | 2026-06-02 |
| 25. TO DO overlay | v1.5 | 2/2 | Complete | 2026-06-02 |
| 26. Filtterit | v1.5 | 2/2 | Complete | 2026-06-02 |
| 27. Siivous & pienet korjaukset | v1.6 | 5/5 | Complete | 2026-06-03 |
| 28. SVG-ikonit | v1.6 | 2/2 | Complete | 2026-06-03 |
| 29. Kortit & sheet redesign | v1.6 | 4/4 | Complete | 2026-06-04 |
| 30. i18n FI/EN | v1.6 | 4/4 | Complete | 2026-06-04 |
| 31. DB-skeema & Storage-perusta | v1.7 | 4/4 | Complete | 2026-06-05 |
| 32. Yritysrekisteröinti & auth | v1.7 | 3/3 | Complete | 2026-06-05 |
| 33. Claim & paikan luonti | v1.7 | 7/7 | Complete | 2026-06-06 |
| 34. Onboarding-velhou | v1.7 | 11/11 | Complete | 2026-06-10 |
| 35. Admin-hyväksyntäjärjestelmä | v1.7 | 11/11 | Complete | 2026-06-10 |
| 36. Hallintapaneeli | v1.7 | 7/7 | Complete | 2026-06-10 |
| 37. Tech Debt Foundation | v1.8 | 1/1 | Complete | 2026-06-11 |
| 38. Business Data Publication | v1.8 | 1/1 | Complete | 2026-06-11 |
| 39. Auth-Separaatio | v1.9 | 0/4 | Not started | - |
| 40. Wizard-konsolidointi & Cleanup | v1.9 | 0/TBD | Not started | - |
