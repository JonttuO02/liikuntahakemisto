# ROADMAP — Liikuntahakemisto

## Milestones

- ✅ **v1.0 MVP** — Phases 1–5 (shipped 2026-05-21)
- ✅ **v1.1 Käyttäjät, Kartta & Laatu** — Phases 6–11 (shipped 2026-05-27)
- ✅ **v1.2 UI-uudistus & Arvostelut** — Phases 12–15 (shipped 2026-05-28)
- ✅ **v1.3 AKTIIVI — Redesign & Polish** — Phases 16–18 (shipped 2026-05-30)
- ✅ **v1.4 UX-parannukset & Profiili** — Phases 19–22 (shipped 2026-05-31)
- 🚧 **v1.5 Visuaalinen elävöitys & UX-hienosäätö** — Phases 23–26 (in progress)

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

---

### 🚧 v1.5 Visuaalinen elävöitys & UX-hienosäätö (In Progress)

**Milestone Goal:** Parannetaan sovelluksen visuaalista ilmettä ja käyttäjäkokemusta animaatioilla, uudistetuilla ikoneilla ja väreillä sekä sulaveammilla interaktioilla.

- [ ] **Phase 23: Visuaalinen perusta** — Sininen liukuväri karttapinneille, kiilto-animaatio, fonttivaihto Outfit:iin, bottom sheet -logo uudistus
- [ ] **Phase 24: Callout-kortti & ikonit** — Callout-kortti suuremmaksi ja pyörittää tietoja; laji-ikonit värillisinä kaikissa komponenteissa
- [ ] **Phase 25: TO DO overlay** — TO DO -lista etusivun päälle animoituna overlayina; arvosteluehdotus poiston yhteydessä
- [ ] **Phase 26: Filtterit** — Yksinkertaistettu filtteri (vain paikkakunta + laji); aktiiviset valinnat karuselli-animaatiolla

## Phase Details

### Phase 23: Visuaalinen perusta
**Goal**: Karttapinnit näyttävät sporttiselta sinisellä liukuvärillä ja animaatiolla; sovelluksen fontti on Outfit ja bottom sheet -logo on uudistettu
**Depends on**: Phase 22 (v1.4 complete)
**Requirements**: MAP-11, MAP-12, MAP-13, UI-22, UI-23
**Success Criteria** (what must be TRUE):
  1. Karttapinnit näyttävät sinistä liukuvärigradienttia (ei enää punaista)
  2. Valittu karttapinni näyttää CSS-animaation (kehä-pulssi transform/opacity only — ei box-shadow)
  3. Klusteripinnin väri on sama sininen teema kuin yksittäiset pinnit
  4. Koko sovelluksen fontti on vaihtunut Inter:stä Outfit:iin ilman layoutmuutoksia
  5. Bottom sheet -logon väri- ja tekstiefekti on uudistettu
**Plans**: 4 plans
Plans:
- [x] 23-01-PLAN.md -- Inter -> Outfit font migration (UI-22)
- [x] 23-02-PLAN.md -- AktiiviLogo redesign: blue sweep auto-loop, 32px (UI-23)
- [x] 23-03-PLAN.md -- SportPin component + spinOrbit animation (MAP-11, MAP-12)
- [ ] 23-04-PLAN.md -- Etusivu integration: wire SportPin, cluster inline HTML (MAP-11, MAP-12, MAP-13)
**UI hint**: yes

### Phase 24: Callout-kortti & ikonit
**Goal**: Callout-kortit ovat suurempia ja pyörittävät lajinimen ja paikan nimen välillä; laji-ikonit ovat värillisiä kaikissa komponenteissa
**Depends on**: Phase 23
**Requirements**: MAP-14, MAP-15
**Success Criteria** (what must be TRUE):
  1. Callout-kortti on leveämpi (130 px → 160 px) kuin aiemmin
  2. Callout-kortti vaihtaa näytettävää tietoa automaattisesti lajin ja paikan nimen välillä (interval-animaatio)
  3. Laji-ikonit näkyvät värillisinä karttapinneissä, callout-korteissa ja listakorteissa (ei enää yhtenäinen harmaasävy)
**Plans**: TBD
**UI hint**: yes

### Phase 25: TO DO overlay
**Goal**: TO DO -lista avautuu etusivun päälle animoituna overlayina erillisen sivunavigaation sijaan; poistaminen ehdottaa arvostelua
**Depends on**: Phase 24
**Requirements**: TODO-03, TODO-04, TODO-05, TODO-06, TODO-07
**Success Criteria** (what must be TRUE):
  1. TO DO -painike toolbarin alla avaa overlaylistauksen etusivun päälle (ei navigoi /suosikit-sivulle); /suosikit-reitti säilyy toimivana
  2. Painike muuttuu X-painikkeeksi kun overlay on auki; X sulkee sen
  3. Overlay avautuu animaatiolla (nappi "sylkee" listan ulos) ja sulkeutuu animoituna
  4. TO DO -lista on visuaalisesti selvästi erottuva hakulistasta (otsikko, oma tyyli)
  5. Kun käyttäjä poistaa paikan listalta, pop-up kysyy "Kävikö paikassa?" ja tarjoaa arvostelulomakkeen
**Plans**: TBD
**UI hint**: yes

### Phase 26: Filtterit
**Goal**: Filtteririvi näyttää vain paikkakunta- ja lajivalinnan; aktiiviset valinnat pyörivät karusellimaisesti filtteripainikkeessa
**Depends on**: Phase 25
**Requirements**: FILTER-02, FILTER-03
**Success Criteria** (what must be TRUE):
  1. Filtterialue näyttää vain paikkakunta- ja lajisuodattimet ("Kertakäynti OK" ja "Auki nyt" -painikkeet poistettu näkyviltä)
  2. Olemassa olevat sessionStorage-tilat ovat yhteensopivia: _v: 2 -kenttä lisätty; vanha sessiodata ei palauta poistettuja filttereitä
  3. Filtteripainike pyörittää karuselli-animaatiolla aktiivisia valintoja kun filttereillä on arvoja
**Plans**: TBD
**UI hint**: yes

---

## Progress Table

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Security | v1.0 | 14/14 | ✅ Complete | 2026-05-19 |
| 2. Map & GPS | v1.0 | 3/3 | ✅ Complete | 2026-05-21 |
| 3. Data Enrichment | v1.0 | 2/2 | ✅ Complete | 2026-05-21 |
| 4. Service Information UI | v1.0 | 4/4 | ✅ Complete | 2026-05-21 |
| 5. AI Weather Widget | v1.0 | 2/2 | ✅ Complete | 2026-05-21 |
| 6. UI Polish & Data Foundation | v1.1 | 7/7 | ✅ Complete | 2026-05-22 |
| 7. Map Infrastructure | v1.1 | 2/2 | ✅ Complete | 2026-05-22 |
| 8. Map Features | v1.1 | 3/3 | ✅ Complete | 2026-05-22 |
| 9. Auth & Favorites | v1.1 | 4/4 | ✅ Complete | 2026-05-23 |
| 10. City Expansion | v1.1 | 4/4 | ✅ Complete | 2026-05-27 |
| 11. PWA | v1.1 | 3/3 | ✅ Complete | 2026-05-27 |
| 12. Haku & korttilistaus etusivulle | v1.2 | 3/3 | ✅ Complete | 2026-05-27 |
| 13. Uusi korttimalli | v1.2 | 2/2 | ✅ Complete | 2026-05-28 |
| 14. Profiilisivu & AI-kotipaikkakunta | v1.2 | 5/5 | ✅ Complete | 2026-05-28 |
| 15. Arvostelut | v1.2 | 4/4 | ✅ Complete | 2026-05-28 |
| 16. Brändi & Logo-uloke | v1.3 | 4/4 | ✅ Complete | 2026-05-29 |
| 17. Toolbar & Haku-UX | v1.3 | 1/1 | ✅ Complete | 2026-05-29 |
| 18. Kartan pinnit & korttianimaatio | v1.3 | 3/3 | ✅ Complete | 2026-05-30 |
| 19. Filtteri, lista & paikka-UX | v1.4 | 3/3 | ✅ Complete | 2026-05-30 |
| 20. Navigaatio-korjaukset | v1.4 | 2/2 | ✅ Complete | 2026-05-30 |
| 21. TO DO -lista | v1.4 | 2/2 | ✅ Complete | 2026-05-31 |
| 22. Profiili & AI-kiinnostukset | v1.4 | 4/4 | ✅ Complete | 2026-05-31 |
| 23. Visuaalinen perusta | v1.5 | 0/4 | 🗂 Planned | - |
| 24. Callout-kortti & ikonit | v1.5 | 0/TBD | Not started | - |
| 25. TO DO overlay | v1.5 | 0/TBD | Not started | - |
| 26. Filtterit | v1.5 | 0/TBD | Not started | - |
