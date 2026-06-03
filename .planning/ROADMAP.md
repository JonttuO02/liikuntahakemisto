# ROADMAP — Liikuntahakemisto

## Milestones

- ✅ **v1.0 MVP** — Phases 1–5 (shipped 2026-05-21)
- ✅ **v1.1 Käyttäjät, Kartta & Laatu** — Phases 6–11 (shipped 2026-05-27)
- ✅ **v1.2 UI-uudistus & Arvostelut** — Phases 12–15 (shipped 2026-05-28)
- ✅ **v1.3 AKTIIVI — Redesign & Polish** — Phases 16–18 (shipped 2026-05-30)
- ✅ **v1.4 UX-parannukset & Profiili** — Phases 19–22 (shipped 2026-05-31)
- ✅ **v1.5 Visuaalinen elävöitys & UX-hienosäätö** — Phases 23–26 (shipped 2026-06-02)
- 🚧 **v1.6 Kielituki, Ikonit & Sheet-redesign** — Phases 27–30 (in progress)

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

---

### 🚧 v1.6 Kielituki, Ikonit & Sheet-redesign (Phases 27–30)

**Milestone Goal:** Englanninkielinen käyttöliittymä (kielivalitsin profiilisivulla), uudet SVG-ikonit kaikille lajeille, PaikkaSheet hero-redesign hinnastolla ja collapsed arvosteluwidgetillä, sekä joukko UI-parannuksia ja bugifixejä.

- [x] **Phase 27: Siivous & pienet korjaukset** — Navigaatiosiivous, filtteri/haku-korjaukset, sheet-korjaukset, klusterizoomi ja UI-häivytys *(5/5 plans)* — 2026-06-03
- [x] **Phase 28: SVG-ikonit** — Uusi lib/sportIcons.tsx -rekisteri, ikonit käytössä kaikkialla (prerequisite for i18n) *(2/2 plans)* — 2026-06-03
- [ ] **Phase 29: Kortit & sheet redesign** — PaikkaSheet hero-karuselli + hinnasto, PaikkaKortti hinnastokaruselli, DiagonaalKortti placeholder-kuvat
- [ ] **Phase 30: i18n FI/EN** — next-intl, NEXT_LOCALE-cookie, kielivalitsin profiilisivulla, kaikki UI-tekstit käännetty

## Phase Details

### Phase 27: Siivous & pienet korjaukset
**Goal**: Kaikki itsenäiset cleanup-tehtävät ja bugifixit ovat valmiina — navigaatio on siisti, filtteripilli toimii oikein, hakuteksti on yksinkertainen, sheet aukeaa ilman viivettä ja klusterin klikkaus zoomaa
**Depends on**: Phase 26
**Requirements**: NAV-06, NAV-07, FILTER-04, FILTER-05, SEARCH-01, UI-24, MAP-16, SHEET-04, SHEET-05, SHEET-06
**Success Criteria** (what must be TRUE):
  1. /suosikit-reitti ei ole olemassa; TO DO -painike ei näy toolbarissa — sivu ei löydy ja linkki puuttuu
  2. FilterCarouselPill-pillillä on hieman harmaa tausta ja klikkaaminen koko pillin alla toimii (ei kummituselementtiä)
  3. Hakukentässä ei näy "Ei tuloksia"- eikä "Tyhjennä haku" -tekstejä missään hakutilanteessa
  4. Korttilistauksen alareunassa on fade-häivytys eikä kartta leikkaa kortteja karkosti
  5. Klusteria klikkaamalla kartta zoomaa lähemmäksi (ellei kyseessä sama koordinaatti); sheet aukeaa ilman viivettä kun pientä korttia klikataan
**Plans**: 5 plans
Plans:

**Wave 1** *(parallel)*
- [x] 27-01-PLAN.md — Delete /suosikit route files and scrub all nav links (NAV-06, NAV-07)
- [x] 27-02-PLAN.md — Remove "Avaa paikkasivu selaimessa" link from PaikkaSheet (SHEET-04)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 27-03-PLAN.md — Pill background, ghost-element fix, remove empty-state text (FILTER-04, FILTER-05, SEARCH-01)

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 27-04-PLAN.md — Rewrite cluster click to zoom via getClusterExpansionZoom; delete expandedCluster state (MAP-16)

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 27-05-PLAN.md — Card list fade overlay, sheet max height, CalloutCard tap delay fix (UI-24, SHEET-05, SHEET-06)
**UI hint**: yes

### Phase 28: SVG-ikonit
**Goal**: Kaikki laji-ikonit tulevat yhdestä lib/sportIcons.ts -rekisteristä — duplikaattirekisterit on poistettu, uudet ikonit näkyvät filtteripillissä, korteissa, karttapinneissä ja CalloutCardissa
**Depends on**: Phase 27
**Requirements**: ICON-01, ICON-02
**Success Criteria** (what must be TRUE):
  1. lib/sportIcons.ts on olemassa ja sisältää polkumerkkijonot kaikille lajeille — Lucide-ikonit on poistettu lib/lajit.ts:stä
  2. Filtteripillissä, PaikkaKortin badgessa, DiagonaalKortissa ja CalloutCardissa näkyy uudet SVG-ikonit
  3. Karttapinneissä näkyy uudet SVG-ikonit samassa sinisessä teemassa kuin ennen
  4. tsc --noEmit läpäisee ilman virheitä (ei rikkonaisia SPORT_ICONS-tyyppiviittauksia)
**Plans**: 2 plans
Plans:

**Wave 1**
- [x] 28-01-PLAN.md — Extract SVGs from final_sports_svg_exports.zip, write lib/sportIcons.tsx (ICON-01)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 28-02-PLAN.md — Migrate 5 consumers, delete Lucide from lib/lajit.ts, run tsc --noEmit (ICON-01, ICON-02)

### Phase 29: Kortit & sheet redesign
**Goal**: PaikkaSheet on visuaalisesti uudistettu hero-osiolla ja hinnastolla; PaikkaKortti näyttää hinnaston karusellina; DiagonaalKortti näyttää logo- ja kuvaplaceholderit
**Depends on**: Phase 28
**Requirements**: UI-25, UI-26, UI-27, SHEET-01, SHEET-02, SHEET-03
**Success Criteria** (what must be TRUE):
  1. PaikkaSheet aukeaa hero-osioon jossa on kuvien karuselli (placeholder: harmaa + kamerakuvake) ja paikan nimi & osoite kuvien päällä
  2. Hero-osion alla on selkeä hinnasto-osio
  3. Arvosteluwidget on oletuksena pienennetty ja aukeaa klikkaamalla
  4. PaikkaKortin alaosassa on rullaava hinnastokaruselli
  5. DiagonaalKortissa vasemmassa yläkulmassa on logopaikka-placeholder ja oikealla kuvapaikka-placeholder laji-ikonin sijaan
**Plans**: TBD
**UI hint**: yes

### Phase 30: i18n FI/EN
**Goal**: Käyttäjä voi vaihtaa käyttöliittymäkielen profiilisivulla FI/EN — valinta säilyy sivulatausten välillä ja kaikki UI-tekstit näkyvät valitulla kielellä; kartan tila ja filtterivalinnat eivät häiriinny
**Depends on**: Phase 29
**Requirements**: I18N-01, I18N-02, I18N-03
**Success Criteria** (what must be TRUE):
  1. Profiilisivulla on kielivalitsin jolla voi vaihtaa FI/EN välillä
  2. Valittu kieli tallentuu NEXT_LOCALE-cookieen ja säilyy sivun uudelleenlatauksen jälkeen
  3. Kaikki UI-tekstit (kortit, filtterit, sheet, navigaatio) näkyvät valitulla kielellä
  4. Kieltä vaihdettaessa kartan sijainti, valittu kaupunki ja lajifiltteri säilyvät ennallaan
**Plans**: TBD

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
| 23. Visuaalinen perusta | v1.5 | 4/4 | ✅ Complete | 2026-06-01 |
| 24. Callout-kortti & ikonit | v1.5 | 1/1 | ✅ Complete | 2026-06-02 |
| 25. TO DO overlay | v1.5 | 2/2 | ✅ Complete | 2026-06-02 |
| 26. Filtterit | v1.5 | 2/2 | ✅ Complete | 2026-06-02 |
| 27. Siivous & pienet korjaukset | v1.6 | 5/5 | ✅ Complete | 2026-06-03 |
| 28. SVG-ikonit | v1.6 | 2/2 | ✅ Complete | 2026-06-03 |
| 29. Kortit & sheet redesign | v1.6 | 0/? | Not started | - |
| 30. i18n FI/EN | v1.6 | 0/? | Not started | - |
