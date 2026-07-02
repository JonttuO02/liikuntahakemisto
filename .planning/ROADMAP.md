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
- ✅ **v1.9 Auth-Separaatio & Cleanup** — Phases 39–40 (shipped 2026-06-12)
- ✅ **v2.0 Business UX & Navigation** — Phases 41–43 (shipped 2026-06-15)
- ✅ **v2.1 AI-pohjainen yrityssivuanalyysi** — Phases 44–46 (shipped 2026-06-16)
- ✅ **v2.2 Onboarding-tekoälyn parannukset** — Phases 47–51.1 (shipped 2026-06-21)
- ✅ **v3.0 Oma tietokanta (Google Places -irtautuminen)** — Phases 52–57 (shipped 2026-06-24)
- 🚧 **v3.1 UX/UI-korjaukset & business-parannukset** — Phases 58–64 (active)

---

## v3.1 — Active Milestone

**Goal:** Korjata admin-pääsy ja kartta-QA, lisätä saman yrityksen sisäinen hallintaoikeuspyyntö, ja yhtenäistää business-dashboardin/preview-näkymien ja paikkasivun ulkoasu venuepage-arkkitehtuurin ympärille.

**Granularity:** standard · **Coverage:** 25/25 v1 requirements mapped

- [x] **Phase 58: Admin-sijaintikartta** — Admin-hakemuksen yksityiskohtasivulla näytetään paikan sijainti omalla read-only-kartalla (ADMIN-06/QA-01 dropped — ks. CONTEXT.md) (completed 2026-06-24)
- [x] **Phase 59: Multi-company-skeemamigraatio** — Yritys-identiteetti irrotetaan login-identiteetistä companies-taululla; gating-edellytys kaikelle hallintaoikeustyölle (completed 2026-06-25)
- [x] **Phase 60: Hallintaoikeuspyynnöt — backend & sähköposti** — Työntekijä voi pyytää hallintaoikeutta, järjestelmä ilmoittaa sähköpostilla ja estää pääsyn ennen hyväksyntää (completed 2026-06-25)
- [x] **Phase 61: Onboarding-vaiheiden uudelleenjärjestys** — Uusi onboarding-virta: nimi+URL ensin (AI taustalla), sijainti, AI-tarkastelu, ei erillistä preview-vaihetta (completed 2026-06-26)
- [x] **Phase 62: Venuepage-konsolidaatio** — Erillinen paikkasivu poistetaan; kaikki sisältö ja navigointi yhdistetään PaikkaSheet-venuepageen, vanha reitti 404 (completed 2026-07-01)
- [x] **Phase 63: Business-dashboardin & preview-näkymien uudistus** — DiagonaalKortti-pohjainen dashboard ikonipainikkeilla, CalloutCard-preview, venuepage live-previewssä, kaikki previewt visuaalisia (completed 2026-07-01)
- [ ] **Phase 64: Hallintaoikeuspyynnöt — dashboard-UI** — Päähallitsija hallitsee pyynnöt ja sub-managerit uudistetussa dashboardissa

### Phase 58: Admin-sijaintikartta

**Goal**: Admin näkee paikan sijainnin kartalla suoraan hakemuksen tarkastelusivulla, ennen hyväksyntäpäätöstä
**Depends on**: Nothing (independent of all other workstreams)
**Requirements**: ADMIN-07
**Note**: ADMIN-06 ja QA-01 dropped 2026-06-24 (ks. 58-CONTEXT.md) — admin-pääsyongelma ei toistunut, kartta-QA tarkistettu manuaalisesti ilman löydöksiä. ADMIN-07 korvaa molemmat tämän phasen sisällä.
**Success Criteria** (what must be TRUE):

  1. `/admin/[id]`-sivulla on uusi "Sijainti"-osio, joka näyttää paikan pinnin kartalla samalla SportPin/CalloutCard-tyylillä kuin pääsivun kartta
  2. Kartta on zoomattava/pannattava, keskitetty paikan koordinaatteihin kiinteällä lähizoomilla (~15)
  3. Pinin klikkaus näyttää CalloutCardin, mutta ei avaa venuepagea tai laukaise muuta navigointia

**Plans**: 1 plan

- [x] 58-01-PLAN.md — Read-only "Sijainti" venue-location map section on /admin/[id] (Map + AdvancedMarker + SportPin + CalloutCard, fixed zoom 15, no-op CalloutCard click)

**UI hint**: yes

### Phase 59: Multi-company-skeemamigraatio

**Goal**: "Yritys" on olemassa entiteettinä erillään "loginista"; tietomalli tukee saman yrityksen useita työntekijöitä samaan paikkaan
**Depends on**: Nothing (independent of Phase 58; strict prerequisite for Phases 60 ja 64)
**Requirements**: ACCESS-01, ACCESS-02
**Success Criteria** (what must be TRUE):

  1. `companies`-taulu ja `business_accounts.company_id`/`role` (owner/member) ovat olemassa; jokainen olemassaoleva tili on migratoitu omaksi yrityksekseen päähallitsijana (owner) yhtenä transaktiona
  2. Ennen migraation ajoa on otettu varmuuskopio ja rollback-mekanismi on vahvistettu (precedent: Phase 53:n varmuuskopioimaton migraatio aiheutti peruuttamatonta datahäviötä — tämä migraatio on auth-vieressä, joten rikkoutunut login olisi pahempi)
  3. `business_paikka_links`-rajoite on löysennetty `UNIQUE(business_account_id, paikka_id)`:ksi, jolloin useampi saman yrityksen tili voi linkittyä samaan paikkaan
  4. RLS-politiikat on kirjoitettu uudelleen `current_company_id()`-helpperifunktiolla; olemassaolevat yritykset näkevät edelleen vain omat paikkansa (regressiotestattu kirjautumisella)

**Plans**: 4 plans
**Wave 1**

- [x] 59-01-PLAN.md — Migration: companies table + company_id/role columns + owner backfill + composite UNIQUE + current_company_id() RLS rewrite + staging dry-run gate (Wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 59-02-PLAN.md — Business-side company_name→companies(name) fixes (create-paikka, reapply, onboarding/submit) + test mock updates (Wave 2)
- [x] 59-03-PLAN.md — Admin-side company_name→companies(name) fixes (approve, reject, applications routes + 3 admin UI files) (Wave 2)
- [x] 59-04-PLAN.md — Signup company-creation + register.test.ts + profiili anon-key read + deploy runbook (Wave 2)

### Phase 60: Hallintaoikeuspyynnöt — backend & sähköposti

**Goal**: Saman yrityksen työntekijä voi pyytää hallintaoikeutta paikkaan, ja järjestelmä käsittelee pyynnön elinkaaren turvallisesti — riippumatta dashboard-UI:sta
**Depends on**: Phase 59 (schema). Independent of Phases 61/62/63 (eri koodipolut)
**Requirements**: ACCESS-03, ACCESS-05, ACCESS-06
**Success Criteria** (what must be TRUE):

  1. Saman yrityksen työntekijä voi hakea hallintaoikeutta paikkaan nimellä/osoitteella; pyyntö tallentuu `business_access_requests`-tauluun pending-tilaan
  2. Päähallitsija saa Resend-sähköpostin pyynnön saapuessa, ja pyytäjä saa sähköpostin päätöksestä (hylkäyssyy valinnainen)
  3. Pyytäjä näkee selkeän "odottaa hyväksyntää" -tilan eikä saa pääsyä paikan hallintaan ennen hyväksyntää — pääsy on estetty RLS-tasolla, ei vain UI:ssa
  4. Samanaikaiset hyväksynnät eivät voi molemmat onnistua (concurrency-turvallinen `UPDATE ... WHERE status='pending'` + count-check, sama paterni kuin `admin/approve`)

**Plans**: 5 plans

**Wave 1**

- [x] 60-01-PLAN.md — Migration: `business_access_requests` table + RLS + D-08 partial UNIQUE index + `business_accounts.company_id` relaxed to nullable (D-09a) + [BLOCKING] `supabase db push`
- [x] 60-02-PLAN.md — `lib/email.ts`: `sendAccessRequestNotificationEmail` (owner) + `sendAccessRequestDecisionEmail` (requester), reusing `sub()`/`esc()`

**Wave 2** *(blocked on Wave 1)*

- [x] 60-03-PLAN.md — No-auto-company invite signup path (D-09a) + `access-request/submit` Route Handler (D-08/D-09/D-10 guards, owner notification)
- [x] 60-04-PLAN.md — `access-request/approve` + `access-request/reject` Route Handlers (concurrency-safe, venue-scoped grant via supabaseAdmin, requester emails)

**Wave 3** *(blocked on Wave 2)*

- [x] 60-05-PLAN.md — `/business/liity` deep-link landing page + "Kopioi kutsulinkki" button + pending banner on `/business` + fi/en i18n keys

### Phase 61: Onboarding-vaiheiden uudelleenjärjestys

**Goal**: Onboarding-virta on uudelleenjärjestetty: paikan nimi + verkko-osoite ensin (AI-analyysi taustalla), sijainti seuraavaksi, AI-tulokset tarkasteltavana, ei erillistä preview-vaihetta
**Depends on**: Nothing (eri koodipolku: onboarding-velhou vs. dashboard/venuepage). Independent of ACCESS/BIZPANEL/VENUEPAGE-työstä
**Requirements**: ONBOARD-18, ONBOARD-19, ONBOARD-20, ONBOARD-21, ONBOARD-22, ONBOARD-23, ONBOARD-24
**Success Criteria** (what must be TRUE):

  1. Erillinen PaikkaStep (vain nimi + siirry-painike) on poistettu; uusi step 1 kerää nimen ja verkko-osoitteen yhdessä, ja verkko-osoitteen syöttö käynnistää AI-sivuanalyysin taustalla heti
  2. Sijainti-step (kartta + osoitehaku-autocomplete) on step 2; jos verkko-osoite annettiin, AI-analyysin tulokset näytetään tarkasteltavaksi omana stepinä sijainti-stepin jälkeen
  3. Lopullinen Preview-step on poistettu kokonaan (live-preview on aina näkyvissä), ja Yhteystiedot-stepistä on poistettu verkko-osoite-kenttä (kerätty jo step 1:ssä)
  4. Etenemispalkin "PREVIEW"-vaihe on korvattu "SUBMIT"-vaiheella, joka saavutetaan onboardingin lähetyksen yhteydessä

**Plans**: 4 plans
**UI hint**: yes

Plans:

- [x] 61-01-PLAN.md — Data layer & i18n foundation (create-paikka name-only, update-paikka 'sijainti' section, 6 new keys)
- [x] 61-02-PLAN.md — New entry components (StepNimiJaURL, StepSijainti) + ClaimSearchForm simplification
- [x] 61-03-PLAN.md — Wizard finalization (remove preview step, inline submit, ProgressBar SUBMIT label)
- [x] 61-04-PLAN.md — Onboarding page state machine rewire + delete StepPaikka

### Phase 62: Venuepage-konsolidaatio

**Goal**: Erillinen paikkasivu on poistettu ja kaikki sen sisältö ja sisäiset navigointipolut on yhdistetty PaikkaSheet-venuepageen
**Depends on**: Nothing structurally; MUST land before Phase 63 (LIVEPREV-05 tarvitsee konsolidoidun venuepagen feature-complete-tilassa)
**Requirements**: VENUEPAGE-01, VENUEPAGE-02, VENUEPAGE-03, VENUEPAGE-04
**Success Criteria** (what must be TRUE):

  1. Poistettavan paikkasivun (`app/paikat/[id]`) ainutlaatuinen sisältö (jota ei vielä ole venuepagella) on siirretty venuepageen (PaikkaSheet) ENNEN sivun poistoa
  2. Erillinen paikkasivu on poistettu kokonaan sovelluksesta
  3. Kaikki sovelluksen sisäiset polut, jotka aiemmin avasivat erillisen paikkasivun, avaavat sen tilalla venuepagen (bottom sheet) samalla tavalla kuin CalloutCardin klikkaus
  4. Suora osoite poistettuun reittiin palauttaa 404 (ei redirectiä)

**Plans**: 4 plans (2 waves + 1 gap-closure wave)
**Wave 1**

- [x] 62-01-PLAN.md — Migrate "Näytä kartalla" to PaikkaSheet as a SheetRow + add PaikkaSheet i18n keys (VENUEPAGE-02) [wave 1]
- [x] 62-02-PLAN.md — DiagonaalKortti `onOpen` prop + replace `<Link>` overlay with conditional callback/no-op (VENUEPAGE-03) [wave 1]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 62-03-PLAN.md — Wire `onOpen` in Etusivu + remove handleCardClick + delete `app/paikat/[id]` + remove PaikkaPage i18n (VENUEPAGE-01/03/04) [wave 2]

**Wave 3** *(gap closure — UAT Test 2 regression)*

- [x] 62-04-PLAN.md — Stop onOpen handlers unmounting search list / TO DO overlay so PaikkaSheet layers over them (VENUEPAGE-03, gap) [wave 1]

**UI hint**: yes

### Phase 63: Business-dashboardin & preview-näkymien uudistus

**Goal**: `/business`-dashboard on uudistettu DiagonaalKortti-korteilla ja ikonipainikkeilla, ja kaikki preview-näkymät käyttävät CalloutCardia, sisältävät venuepagen ja ovat puhtaasti visuaalisia
**Depends on**: Phase 62 (LIVEPREV-05 tarvitsee konsolidoidun venuepagen). Land before Phase 64 (molemmat koskevat `app/business/page.tsx`)
**Requirements**: BIZPANEL-06, BIZPANEL-07, PREV-04, LIVEPREV-05, PREV-05
**Success Criteria** (what must be TRUE):

  1. `/business`-dashboardin paikkalista on korvattu DiagonaalKortti-korteilla, joiden kuvan alakulmassa näkyvät status-pillit
  2. Hover (desktop) / tap (mobiili) paljastaa kortin oikealta piilotetun lisäosan pyöreillä ikonipainikkeilla (preview/edit/jatka) — ei tekstipainikkeita
  3. Business-paikkalistan preview-modaali käyttää CalloutCardia (vanhentunut PaikkaKortti-näkymä poistettu), ja edit/onboarding-live-preview sisältää venuepagen (PaikkaSheet) CalloutCardin ja DiagonaalKortin lisäksi
  4. Kaikki preview-näkymät (dashboardin preview-modaali, edit/onboarding-livepreview) ovat puhtaasti visuaalisia — klikkaus ei laukaise navigointia tai toimintoja

**Plans**: 7 plans (3 waves + 1 gap-closure wave)

Plans:
**Wave 1**

- [x] 63-01-PLAN.md — getPanelShade() color-derivation foundation (extract darkenHex/lightenHex, add getPanelShade to brandingResult.ts)
- [x] 63-02-PLAN.md — Preview-surface composition: CalloutCard in PreviewModal, PaikkaSheet 3rd section in LivePreviewPane, booking-link preview guard fix
- [x] 63-03-PLAN.md — update-paikka auto-resubmit-on-save backend (D-07), server-derived + concurrency-guarded

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 63-04-PLAN.md — DiagonaalKortti dashboard-variant controls panel + status pill + RejectionReasonPopup component

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 63-05-PLAN.md — Wire dashboard cards into /business, remove reapply UI, delete /api/business/reapply route

**Wave 4** *(gap closure — UAT Test 1 findings)*

- [x] 63-06-PLAN.md — Controls-panel neutral-gray fallback, copy-link visible confirmation, /business desktop grid layout
- [x] 63-07-PLAN.md — Business-analysis pipeline reliability: parallel uploads, max-duration guard, GET staleness self-heal, wizard retry UI

**UI hint**: yes

### Phase 64: Hallintaoikeuspyynnöt — dashboard-UI

**Goal**: Päähallitsija hallitsee odottavat hallintaoikeuspyynnöt ja sub-managerien oikeudet uudistetussa `/business`-dashboardissa
**Depends on**: Phase 60 (backend & RLS) ja Phase 63 (dashboard-redesign — vältetään throwaway-UI vanhaa listalayoutia vasten)
**Requirements**: ACCESS-04, ACCESS-07
**Success Criteria** (what must be TRUE):

  1. Paikan päähallitsija näkee odottavat hallintaoikeuspyynnöt `/business`-dashboardissa ja voi hyväksyä/hylätä ne
  2. Sub-managerit eivät voi hyväksyä toisten pyyntöjä (estetty sekä UI:ssa että backendissä)
  3. Päähallitsija voi poistaa sub-managerin hallintaoikeuden paikasta
  4. Päähallitsijaa itseään ei voi poistaa tämän virran kautta (kova esto)

**Plans**: 5 plans (2 waves + 1 gap-closure)
**Wave 1**

- [x] 64-01-PLAN.md — List Route Handler (pending requests + team read, service-role, ACCESS-04) [W1]
- [x] 64-02-PLAN.md — Removal Route Handler (venue-scoped, self-block, ACCESS-07) [W1]
- [x] 64-03-PLAN.md — display_name migration + schema push + invite-signup wiring fix (D-05/D-15) [W1]

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 64-04-PLAN.md — TeamManagementPopup + DiagonaalKortti icon + dashboard wiring (ACCESS-04/07) [W2]

**Gap closure** *(from UAT Test 3)*

- [ ] 64-05-PLAN.md — Approve flow: append approved member to Current team immediately (ACCESS-04) [gap]

**UI hint**: yes

### v3.1 Dependency Graph

```
Phase 58 (admin/QA) ──────────────────── independent, parallel-safe

Phase 59 (schema) ──> Phase 60 (access backend) ──┐
                                                    ├──> Phase 64 (access UI)
Phase 62 (venuepage) ──> Phase 63 (dashboard) ─────┘
                                  ▲ LIVEPREV-05 needs consolidated venuepage

Phase 61 (onboarding reorder) ─────────── independent, parallel-safe
```

**Critical path:** 59 → 60 → 64 and 62 → 63 → 64. Phases 58 and 61 are independent.

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

<details>
<summary>✅ v1.9 Auth-Separaatio & Cleanup (Phases 39–40) — SHIPPED 2026-06-12</summary>

- [x] **Phase 39: Auth-Separaatio** — Eriytetyt auth-sessiot: sb-biz-* business-puolelle, sb-* consumer-puolelle; simultaanisessiot mahdollisia *(4/4 plans)* — 2026-06-12
- [x] **Phase 40: Wizard-konsolidointi & Cleanup** — WizardInner-yhdistäminen, testitilien siivousmigraatio, kuollut koodi poistettu *(3/3 plans)* — 2026-06-12

Full archive: `.planning/milestones/v1.9-ROADMAP.md`

</details>

<details>
<summary>✅ v2.0 Business UX & Navigation (Phases 41–43) — SHIPPED 2026-06-15</summary>

- [x] **Phase 41: Navigation Foundation** — BusinessNav component + consumer NavBar hidden on /business/* + post-login redirect *(2 plans)* — 2026-06-12
- [x] **Phase 42: Dashboard & Map** — /business dashboard redesign (status card + venue list + actions) + /business/map full-screen map with two-step pin interaction *(2 plans + 1 gap-fix)* — 2026-06-15
- [x] **Phase 43: Business Profile** — /business/profiili: read-only account info, editable phone, language toggle, sign-out *(3 plans: Wave 1×2 + Wave 2×1)* — 2026-06-15

Full archive: `.planning/milestones/v2.0-ROADMAP.md`

</details>

---

<details>
<summary>v2.1 AI-pohjainen yrityssivuanalyysi (Phases 44-46) - SHIPPED 2026-06-16</summary>

- [x] **Phase 44: Brandidatan tietokantaperusta** - business_branding-taulu RLS-politiikat (1/1 plans) - 2026-06-15
- [x] **Phase 45: Scraper & Claude API -putki** - HTML-haku, logo-poiminta, sharp-konversio, Claude-kutsu (4/4 plans) - 2026-06-15
- [x] **Phase 46: Pre-vaihe UI & velhointegraatio** - Analysoi sivusto, esikatseluruutu, esitaytto steps 3-5 (5/5 plans) - 2026-06-16

Full archive: .planning/milestones/v2.1-ROADMAP.md

</details>

---

<details>
<summary>✅ v2.2 Onboarding-tekoälyn parannukset (Phases 47–51.1) — SHIPPED 2026-06-21</summary>

- [x] **Phase 47: Skeema & monisivuinen scraper-putki** — Schema migration + multi-page crawl with re-validated SSRF guard + labeled multi-page Claude prompt *(5/5 plans)* — 2026-06-16
- [x] **Phase 48: Logo-, väri- ja galleriavalinta** — Multi-candidate logo picker, 2-color swatch picker, validated PATCH route, gallery prefill *(4/4 plans)* — 2026-06-17
- [x] **Phase 49: Esikatselu- ja kontrastikorjaukset** — Step 6 CalloutCard swap + shared contrast-safe logo primitive *(2/2 plans)* — 2026-06-17
- [x] **Phase 50: Flow-uudelleenjärjestys & pikahyväksyntä** — StepPaikka before URL-analysis + quick-accept shortcut into admin queue *(2/2 plans)* — 2026-06-17
- [x] **Phase 51: Live-esikatselu velhossa** — Shared live-preview state, desktop split-view, mobile toggle *(7/7 plans)* — 2026-06-18
- [x] **Phase 51.1: Live preview on AnalysoiSivusto results screen** — Threaded live CalloutCard/DiagonaalKortti preview into the pre-wizard analyze/quick-accept screen *(2/2 plans)* — 2026-06-19

Full archive: `.planning/milestones/v2.2-ROADMAP.md`

</details>

---

<details>
<summary>✅ v3.0 Oma tietokanta (Google Places -irtautuminen) (Phases 52–57) — SHIPPED 2026-06-24</summary>

- [x] **Phase 52: Cleanup — i18n-merkkijonot & AuthModal-bugi** — EN-locale-käyttäjä ei näe kovakoodattuja suomenkielisiä merkkijonoja; AuthModal-virheviestin precedence-bugi korjattu (CLEAN-06, CLEAN-07) (completed 2026-06-22)
- [x] **Phase 53: Google Places -datan ja synkkauksen poisto** — sync-paikat-reitti poistettu; Google-peräiset paikkarivit poistettu provenance-tarkistuksella (DATA-11, DATA-12) (completed 2026-06-22)
- [x] **Phase 54: Sijainti — karttapinni & osoitehaku onboardingissa** — käyttäjä sijoittaa paikan kartalle klikkaamalla tai osoitehaulla; vain lat/lng + kirjoitettu osoite tallennetaan (SIJAINTI-01, SIJAINTI-02, SIJAINTI-03) (completed 2026-06-23)
- [x] **Phase 55: AI-lajiluokitus sivuanalyysiin** — AI-sivuanalyysi ehdottaa lajikategoriaa; käyttäjä vahvistaa tai vaihtaa sen (AI-06) (completed 2026-06-23)
- [x] **Phase 56: Claim/create-rework — luo paikka alusta + nimikäytäntö** — claim-haku poistettu; käyttäjä luo paikan aina alusta, syöttää yritys- ja toimipistenimen erikseen (CLAIM-04, CLAIM-05) (completed 2026-06-24)
- [x] **Phase 57: Dashboard-redirect-korjaus & Kesken-tila** — /business ei koskaan automaattiredirectaa onboardingiin; kesken jäänyt onboarding näkyy Kesken-badgella jatkamismahdollisuudella (BIZPANEL-04, BIZPANEL-05) (completed 2026-06-24)

Full archive: `.planning/milestones/v3.0-ROADMAP.md`

</details>

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
| 39. Auth-Separaatio | v1.9 | 4/4 | Complete | 2026-06-12 |
| 40. Wizard-konsolidointi & Cleanup | v1.9 | 3/3 | Complete | 2026-06-12 |
| 41. Navigation Foundation | v2.0 | 2/2 | Complete | 2026-06-12 |
| 42. Dashboard & Map | v2.0 | 3/3 | Complete | 2026-06-15 |
| 43. Business Profile | v2.0 | 3/3 | Complete | 2026-06-15 |
| 44. Brändidatan tietokantaperusta | v2.1 | 1/1 | Complete | 2026-06-15 |
| 45. Scraper & Claude API -putki | v2.1 | 4/4 | Complete | 2026-06-15 |
| 46. Pre-vaihe UI & velhointegraatio | v2.1 | 5/6 | Complete    | 2026-06-15 |
| 47. Skeema & monisivuinen scraper-putki | v2.2 | 5/5 | Complete    | 2026-06-16 |
| 48. Logo-, väri- ja galleriavalinta | v2.2 | 4/4 | Complete    | 2026-06-17 |
| 49. Esikatselu- ja kontrastikorjaukset | v2.2 | 2/2 | Complete    | 2026-06-17 |
| 50. Flow-uudelleenjärjestys & pikahyväksyntä | v2.2 | 2/2 | Complete   | 2026-06-17 |
| 51. Live-esikatselu velhossa | v2.2 | 7/7 | Complete    | 2026-06-18 |
| 51.1. Live preview on AnalysoiSivusto results screen | v2.2 | 2/2 | Complete    | 2026-06-19 |
| 52. Cleanup — i18n & AuthModal | v3.0 | 1/1 | Complete    | 2026-06-22 |
| 53. Google Places -datan & synkkauksen poisto | v3.0 | 3/3 | Complete    | 2026-06-22 |
| 54. Sijainti — karttapinni & osoitehaku | v3.0 | 3/3 | Complete    | 2026-06-23 |
| 55. AI-lajiluokitus sivuanalyysiin | v3.0 | 3/3 | Complete    | 2026-06-23 |
| 56. Claim/create-rework — luo alusta + nimikäytäntö | v3.0 | 2/2 | Complete    | 2026-06-24 |
| 57. Dashboard-redirect-korjaus & Kesken-tila | v3.0 | 1/1 | Complete    | 2026-06-24 |
| 58. Admin-pääsy & kartta-QA | v3.1 | 1/1 | Complete    | 2026-06-24 |
| 59. Multi-company-skeemamigraatio | v3.1 | 4/4 | Complete    | 2026-06-25 |
| 60. Hallintaoikeuspyynnöt — backend & sähköposti | v3.1 | 6/6 | Complete    | 2026-06-25 |
| 61. Onboarding-vaiheiden uudelleenjärjestys | v3.1 | 6/6 | Complete    | 2026-06-26 |
| 62. Venuepage-konsolidaatio | v3.1 | 4/4 | Complete    | 2026-06-30 |
| 63. Business-dashboardin & preview-näkymien uudistus | v3.1 | 7/7 | Complete    | 2026-07-01 |
| 64. Hallintaoikeuspyynnöt — dashboard-UI | v3.1 | 4/4 | Complete   | 2026-07-02 |
