# ROADMAP — Liikuntahakemisto

## Milestones

- ✅ **v1.0 MVP** — Phases 1–5 (shipped 2026-05-21)
- ✅ **v1.1 Käyttäjät, Kartta & Laatu** — Phases 6–11 (shipped 2026-05-27)
- ✅ **v1.2 UI-uudistus & Arvostelut** — Phases 12–15 (shipped 2026-05-28)

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

---

### 🚧 v1.2 UI-uudistus & Arvostelut (In Progress)

**Milestone Goal:** Poistetaan erillinen listanäkymä ja integroidaan haku sekä paikkojenselailu etusivulle uudella diagonaalisella korttimallilla; lisätään arvostelusysteemi kirjautuneille käyttäjille ja kotikaupunkipersonointi AI-suositukseen.

- [x] **Phase 12: Haku & korttilistaus etusivulle** — Search icon in left toolbar + real-time card list panel; remove LiikuntapaikatLista and /?nakyma=lista route (completed 2026-05-27)
- [x] **Phase 13: Uusi korttimalli** — Diagonal split card with Google Static Maps snapshot for home page list (completed 2026-05-28)
- [x] **Phase 14: Profiilisivu & AI-kotipaikkakunta** — /profiili page, Supabase profiles table, home city field, AI home/away context (completed 2026-05-28)
- [x] **Phase 15: Arvostelut** — Reviews table, ReviewForm, ReviewList on venue profile page, star average
 (completed 2026-05-28)

---

## Phase Details

### Phase 12: Haku & korttilistaus etusivulle
**Goal**: Käyttäjä voi hakea liikuntapaikkoja suoraan etusivulta ja selata kaikkia paikkoja korttilistana — erillinen listanäkymäsivu on poistettu
**Depends on**: Phase 11
**Requirements**: UI-09, UI-10
**Success Criteria** (what must be TRUE):
  1. Käyttäjä klikkaa hakuikonin vasemmasta toolbarista ja hakukenttä avautuu — tulokset päivittyvät reaaliaikaisesti kirjoittaessa
  2. Kaikki (filtterin mukainen) liikuntapaikat näkyvät scrollattavana korttilistana hakukentän alla etusivulla
  3. Osoitteeseen `/?nakyma=lista` navigointi ohjaa etusivulle eikä erillistä listasivua enää renderöidä
  4. `LiikuntapaikatLista`-komponentti ja siihen liittyvä reitti on poistettu koodipohjasta kokonaan
**Plans**: TBD
**UI hint**: yes

### Phase 13: Uusi korttimalli
**Goal**: Etusivun korttilistassa jokainen kortti käyttää uutta diagonaalista mallia jossa paikan tiedot ja Static Maps -snapshot ovat rinnakkain
**Depends on**: Phase 12
**Requirements**: UI-11
**Success Criteria** (what must be TRUE):
  1. Etusivun korttilistassa jokainen kortti näyttää vasemmalla puolella paikan nimen, lajin, hinnan, aukioloajan ja etäisyyden
  2. Kortissa on oikealla puolella Google Static Maps -kuvakaappaus paikan sijainnista pin-ikonin kanssa
  3. Kartan zoom-kortit (MAP-06-ominaisuus) pysyvät ennallaan — ne eivät käytä uutta diagonaalimallia
**Plans:** 2 plans
  - [ ] 13-01-PLAN.md — Create DiagonaalKortti.tsx component (clip-path diagonal split, Static Maps thumbnail, sport-color fallback)
  - [ ] 13-02-PLAN.md — Swap PaikkaKortti → DiagonaalKortti in Etusivu.tsx + human verification of visual rendering and Static Maps loading
**UI hint**: yes

### Phase 14: Profiilisivu & AI-kotipaikkakunta
**Goal**: Kirjautuneella käyttäjällä on profiilisivu jossa voi tallentaa kotipaikkakuntansa, ja AI-suositus hyödyntää tätä tietoa
**Depends on**: Phase 11
**Requirements**: AUTH-04, AI-05
**Success Criteria** (what must be TRUE):
  1. Kirjautunut käyttäjä näkee `/profiili`-sivulla sähköpostiosoitteensa ja voi kirjoittaa kotipaikkakuntansa tekstikenttään
  2. Kotipaikkakunta tallentuu Supabaseen ja on edelleen näkyvissä sivun uudelleenlatauksessa
  3. Kun kotipaikkakunta on asetettu, `/api/saasuositus`-promptiin lisätään tieto kotikaupungista ja nykyisestä sijaintikaupungista — Claude käyttää tätä kontekstia generoidessaan suosituksen (ei näytetä eksplisiittistä "kotona/reissussa"-tekstiä käyttäjälle)
**Plans:** 5/5 plans complete
  - [x] 14-01-PLAN.md — Supabase profiles migration (CREATE TABLE + RLS) + buildReissuKonteksti helper with unit tests
  - [x] 14-02-PLAN.md — Add Profiili navigation link to NavPill.tsx and Etusivu.tsx inline pill
  - [x] 14-03-PLAN.md — Create /profiili page shell and ProfiiliClient component (auth machine, profiles upsert)
  - [x] 14-04-PLAN.md — Extend Etusivu.tsx (kotikaupunki state + profiles fetch + POST trigger) and route.ts (kotikaupunki parsing + reissussa prompt)
  - [x] 14-05-PLAN.md — Human verification of full Phase 14 feature
**UI hint**: yes

### Phase 15: Arvostelut
**Goal**: Kirjautunut käyttäjä voi jättää arvostelun liikuntapaikalle ja kaikki paikan arvostelut näkyvät profiilisivulla tähtiarvosanojen keskiarvoineen
**Depends on**: Phase 14
**Requirements**: REVIEW-01, REVIEW-02, REVIEW-03, REVIEW-04
**Success Criteria** (what must be TRUE):
  1. Kirjautunut käyttäjä voi jättää arvostelun (1–5 tähteä + vapaa teksti) paikan profiilisivulla — toinen arvostelu samaan paikkaan ei onnistu
  2. Arvostelija valitsee per arvostelu näkyykö oma nimi vai jääkö arvostelu anonyymiksi
  3. Arvostelu sisältää käyntipäivämäärän (date picker) ja ruuhka-arvion (hiljaista / sopivasti / ruuhkaista)
  4. Paikan profiilisivu näyttää kaikki kyseisen paikan arvostelut sekä tähtiarvosanojen laskennallisen keskiarvon
  5. Kirjautumaton käyttäjä näkee olemassa olevat arvostelut mutta ei arvostelulomaketta
**Plans:** 4/4 plans complete
  - [x] 15-01-PLAN.md — Wave 0: reviewUtils helpers (TDD) + reviews migration + [BLOCKING] supabase db push
  - [x] 15-02-PLAN.md — StarPicker controlled input + ReviewSection shell (.glass card, StarAverage, list, Näytä kaikki)
  - [x] 15-03-PLAN.md — ReviewForm: auth machine (4 states), upsert with onConflict, router.refresh()
  - [x] 15-04-PLAN.md — Integrate ReviewSection into app/paikat/[id]/page.tsx + human verification (REVIEW-01..04 end-to-end)
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
| 14. Profiilisivu & AI-kotipaikkakunta | v1.2 | 5/5 | Complete   | 2026-05-28 |
| 15. Arvostelut | v1.2 | 4/4 | Complete   | 2026-05-28 |
