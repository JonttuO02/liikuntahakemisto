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
- 🚧 **v3.0 Oma tietokanta (Google Places -irtautuminen)** — Phases 52–57 (in progress)

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

### 🚧 v3.0 Oma tietokanta (Google Places -irtautuminen) (Phases 52–57) — ACTIVE

**Milestone goal:** Poistaa Google Places -datan tallennus kokonaan ja siirtyä täysin omaan, yritysten itse syöttämään paikkadataan.

- [x] **Phase 52: Cleanup — i18n-merkkijonot & AuthModal-bugi** — EN-locale-käyttäjä ei näe kovakoodattuja suomenkielisiä merkkijonoja; AuthModal-virheviestin precedence-bugi korjattu (CLEAN-06, CLEAN-07) (completed 2026-06-22)
- [ ] **Phase 53: Google Places -datan ja synkkauksen poisto** — sync-paikat-reitti poistettu; Google-peräiset paikkarivit poistettu provenance-tarkistuksella (DATA-11, DATA-12)
- [ ] **Phase 54: Sijainti — karttapinni & osoitehaku onboardingissa** — käyttäjä sijoittaa paikan kartalle klikkaamalla tai osoitehaulla; vain lat/lng + kirjoitettu osoite tallennetaan (SIJAINTI-01, SIJAINTI-02, SIJAINTI-03)
- [ ] **Phase 55: AI-lajiluokitus sivuanalyysiin** — AI-sivuanalyysi ehdottaa lajikategoriaa; käyttäjä vahvistaa tai vaihtaa sen (AI-06)
- [ ] **Phase 56: Claim/create-rework — luo paikka alusta + nimikäytäntö** — claim-haku poistettu; käyttäjä luo paikan aina alusta, syöttää yritys- ja toimipistenimen erikseen (CLAIM-04, CLAIM-05)
- [ ] **Phase 57: Dashboard-redirect-korjaus & Kesken-tila** — /business ei koskaan automaattiredirectaa onboardingiin; kesken jäänyt onboarding näkyy Kesken-badgella jatkamismahdollisuudella (BIZPANEL-04, BIZPANEL-05)

#### Phase Details

##### Phase 52: Cleanup — i18n-merkkijonot & AuthModal-bugi

**Goal**: EN-locale-käyttäjä näkee koko käyttöliittymän valitsemallaan kielellä, ja AuthModalin virheviestien luokittelu toimii oikein
**Depends on**: Nothing (first phase, independent of all other v3.0 work)
**Requirements**: CLEAN-06, CLEAN-07
**Success Criteria** (what must be TRUE):

  1. EN-locale-käyttäjä näkee AuthModalissa englanninkieliset lataus- ja tilanvaihtotekstit (ei kovakoodattuja suomenkielisiä merkkijonoja)
  2. EN-locale-käyttäjä näkee Etusivun CalloutCardin, paikkasivun sijaintirivin ja DiagonaalKortin aria-labelin englanniksi
  3. AuthModalin virheviestin luokittelu tuottaa oikean viestin kun virhe vastaa useita ehtoja (precedence-bugi `A || B && C` → `(A || B) && C` korjattu)

**Plans**: 1/1 plans complete

- [x] 52-01-PLAN.md — Verify CLEAN-06 i18n coverage + CLEAN-07 precedence fix (file/line + git evidence); export mapError/mapBusinessError and add Vitest regression test guarding the precedence behavior

##### Phase 53: Google Places -datan ja synkkauksen poisto

**Goal**: Google Places -synkkaus ei enää aja koodissa, ja kaikki puhtaasti Google-peräiset paikkarivit on poistettu tietokannasta ilman, että yritysten claimaamia paikkoja, arvosteluja tai suosikkeja menetetään vahingossa
**Depends on**: Phase 52 (sequencing only — no code coupling)
**Requirements**: DATA-11, DATA-12
**Success Criteria** (what must be TRUE):

  1. `/api/admin/sync-paikat`-reitti ja sen ajastus on poistettu kokonaan koodista; reitin kutsu palauttaa 404
  2. Puhtaasti Google-peräiset paikkarivit (ei `business_paikka_links`-riviä lainkaan) on poistettu tietokannasta
  3. Yritysten claimaamat paikat (`business_paikka_links.link_type = 'claim'`) säilyvät — niitä EI poisteta vaikka `business_managed` olisi mikä tahansa
  4. `reviews`- ja `suosikit`-rivimäärät on auditoitu ennen ja jälkeen poiston; vain tarkoituksellinen pudotus tapahtuu (ei cascade-kollateraalia)

**Plans**: 3 plans
**Wave 1**

- [ ] 53-01-PLAN.md — Delete sync-paikat route + obsolete filter test (DATA-11); confirm reference isolation, route → 404, suite green
- [ ] 53-02-PLAN.md — Author provenance-aware deletion migration (NOT EXISTS on business_paikka_links) + standalone before/after row-count audit script (DATA-12, file-authoring half)

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 53-03-PLAN.md — [BLOCKING] Human-gated supabase db push: capture audit baseline → apply irreversible deletion → confirm claimed venues survived (DATA-12, execution half)

##### Phase 54: Sijainti — karttapinni & osoitehaku onboardingissa

**Goal**: Yritys voi onboardingin luo-alusta-polussa määrittää paikan sijainnin kartalta, ja vain käyttäjän hyväksymä lat/lng + hänen kirjoittamansa osoite tallennetaan — ilman pysyvää Google Places -datan tallennusta
**Depends on**: Phase 52 (sequencing); independent of Phase 53
**Requirements**: SIJAINTI-01, SIJAINTI-02, SIJAINTI-03
**Success Criteria** (what must be TRUE):

  1. Käyttäjä voi sijoittaa pinnin kartalle klikkaamalla onboardingin Sijainti-vaiheessa
  2. Käyttäjä voi hakea osoitetta autocomplete-kentästä; valinta asettaa pinnin ja zoomaa kartan kohteeseen
  3. Tallennettuun paikkaan kirjautuu vain lat/lng + käyttäjän kirjoittama osoiteteksti — ei `place_id`:tä eikä muuta raakaa Places-vastausdataa
  4. Kartta latautuu Sijainti-vaiheessa ilman Maps JS API:n kaksoislatausta (yksi olemassa oleva `APIProvider`)

**Plans**: TBD
**UI hint**: yes

##### Phase 55: AI-lajiluokitus sivuanalyysiin

**Goal**: Onboardingin AI-sivuanalyysi ehdottaa paikan lajikategoriaa verkkosivun perusteella, ja käyttäjä vahvistaa tai vaihtaa ehdotuksen ennen sen tallentumista — ilman että olemassa olevan logo/väri/hinnasto/aukioloaika-poiminnan laatu heikkenee
**Depends on**: Phase 52 (sequencing); independent of Phases 53–54
**Requirements**: AI-06
**Success Criteria** (what must be TRUE):

  1. AI-sivuanalyysi palauttaa ehdotetun lajikategorian `lib/lajit.ts`-taksonomiasta (ei vapaata tekstiä)
  2. Käyttäjä näkee ehdotuksen erottuvana "ehdotus"-elementtinä ja voi vahvistaa sen tai vaihtaa toiseen lajiin ennen tallennusta
  3. Lajikategoriaa ei kirjoiteta `liikuntapaikat.laji`-kenttään ilman käyttäjän eksplisiittistä vahvistusta
  4. Olemassa olevat poiminnat (logo, värit, hinnasto, aukioloajat) toimivat regressiottomasti, vaikka Claude-vastaus jättäisi lajikentän pois

**Plans**: TBD
**UI hint**: yes

##### Phase 56: Claim/create-rework — luo paikka alusta + nimikäytäntö

**Goal**: Yritys luo paikan onboardingissa aina alusta (ei enää olemassa-olevan-paikan-hakua), syöttää yrityksen ja toimipisteen nimen erillisiin kenttiin yhtenäisellä normalisoinnilla, eivätkä kesken jääneet vanhan mallin onboardingit hajoa muutoksen myötä
**Depends on**: Phase 54 (Sijainti on osa luo-alusta-polkua, johon nimikentät kytkeytyvät)
**Requirements**: CLAIM-04, CLAIM-05
**Success Criteria** (what must be TRUE):

  1. Onboardingin Paikka-vaiheessa ei ole enää olemassa-olevan-paikan-hakua; käyttäjä luo paikan aina alusta
  2. Käyttäjä syöttää yrityksen nimen ja toimipisteen nimen erillisiin kenttiin; nimet normalisoidaan yhtenäiseen kirjoitusasuun
  3. Uuden paikan luonti onnistuu eikä riko olemassa olevaa `UNIQUE(paikka_id)`-rajoitusta — toinen yritys saa edelleen 409:n yrittäessään luoda/claimata jo linkitetyn paikan
  4. Ennen muutosta kesken jääneet `onboarding_draft`-/pending-rivit näkyvät täytetyillä (ei tyhjillä) nimikentillä backfillin ansiosta

**Plans**: TBD
**UI hint**: yes

##### Phase 57: Dashboard-redirect-korjaus & Kesken-tila

**Goal**: Kirjautunut yritys päätyy aina /business-dashboardille (ei koskaan automaattiseen onboarding-redirectiin), ja kesken jäänyt onboarding näkyy dashboardilla per-paikka Kesken-badgella, josta käyttäjä voi jatkaa valitsemalla paikan — kytkettynä Phase 56:n uudistettuun luo-polkuun
**Depends on**: Phase 56 (dashboardin "ei paikkoja vielä" -haara ja Kesken-jatka-nappi kytkeytyvät uudistettuun luo/claim-sisääntuloon; tehdään vasta reworkin jälkeen jotta vältetään heittohukka — per PITFALLS Pitfall 9)
**Requirements**: BIZPANEL-04, BIZPANEL-05
**Success Criteria** (what must be TRUE):

  1. /business-sivu ei koskaan automaattiredirectaa onboardingiin — kirjautunut yritys näkee aina dashboardin tai business-kirjautumisen
  2. Kesken jäänyt onboarding näkyy dashboardilla per-paikka "Kesken"-badgella
  3. Käyttäjä voi jatkaa kesken jäänyttä onboardingia valitsemalla paikan dashboardilta (siirtyy `/business/onboarding?paikka_id=X`)
  4. Tili, jolla on 2+ samanaikaista kesken jäänyttä onboardingia, näkee jokaisen erillisenä jatkettavana rivinä (ei yhtä booleania)

**Plans**: TBD
**UI hint**: yes

#### v3.0 Dependency Order

```
52 (cleanup, independent)
53 (decommission, independent)
54 (Sijainti) ──┐
55 (AI-laji, independent) │
                ├──→ 56 (claim/create rework) ──→ 57 (dashboard + redirect fix, LAST)
```

- Phases 52, 53, 55 are independent and parallel-safe.
- Phase 54 (Sijainti) feeds Phase 56 (rework): the location step is part of the create-from-scratch path the rework reshapes.
- Phase 57 must be **last** — BIZPANEL-04/05's dashboard work couples to Phase 56's reworked create/claim entry; building the Kesken-resume UI before the rework lands is throwaway work (PITFALLS.md Pitfall 9, ARCHITECTURE.md Migration Order).

> **Ordering note (reconciled):** research SUMMARY.md placed the redirect fix early; ARCHITECTURE.md's migration order favors landing it first as a pure-frontend de-risk. PITFALLS.md Pitfall 9, however, establishes that BIZPANEL-04/05 directly couples to CLAIM-04/05's reworked entry point, so the redirect/dashboard phase is sequenced **after** the rework to avoid re-fixing it twice. This roadmap follows the PITFALLS sequencing.

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
| 53. Google Places -datan & synkkauksen poisto | v3.0 | 0/0 | Not started | - |
| 54. Sijainti — karttapinni & osoitehaku | v3.0 | 0/0 | Not started | - |
| 55. AI-lajiluokitus sivuanalyysiin | v3.0 | 0/0 | Not started | - |
| 56. Claim/create-rework — luo alusta + nimikäytäntö | v3.0 | 0/0 | Not started | - |
| 57. Dashboard-redirect-korjaus & Kesken-tila | v3.0 | 0/0 | Not started | - |
