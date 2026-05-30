# ROADMAP — Liikuntahakemisto

## Milestones

- ✅ **v1.0 MVP** — Phases 1–5 (shipped 2026-05-21)
- ✅ **v1.1 Käyttäjät, Kartta & Laatu** — Phases 6–11 (shipped 2026-05-27)
- ✅ **v1.2 UI-uudistus & Arvostelut** — Phases 12–15 (shipped 2026-05-28)
- ✅ **v1.3 AKTIIVI — Redesign & Polish** — Phases 16–18 (shipped 2026-05-30)
- 🚧 **v1.4 UX-parannukset & Profiili** — Phases 19–22 (in progress)

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

---

### 🚧 v1.4 UX-parannukset & Profiili (Phases 19–22)

**Milestone Goal:** Korjataan navigaation käyttäytyminen ja visuaaliset epäjohdonmukaisuudet; uudistetaan suosikit TO DO -listaksi; lisätään kiinnostuksen kohteet profiiliin AI-personointia varten.

- [ ] **Phase 19: Filtteri, lista & paikka-UX** — Kertakäynti-filtteri, paikka kuva listakortissa, AI-widget tila, pin-nappi listakortissa, image_url Supabaseen
- [x] **Phase 20: Navigaatio-korjaukset** — Back-scroll, "Näytä kartalla" paikan koordinaatit, bottomsheet-avausanimaatio, toolbar-cleanup (2/2 plans) — 2026-05-30
- [ ] **Phase 21: TO DO -lista** — Suosikit → TO DO, sydän → kirjanmerkki, /suosikit toimiva TO DO -lista
- [ ] **Phase 22: Profiili & AI-kiinnostukset** — Kiinnostuksen kohteet monivalintana profiiliin, käytetään AI-suosituksissa

## Phase Details

### Phase 19: Filtteri, lista & paikka-UX
**Goal**: Users see venue photos in list cards, can filter by drop-in availability, and can jump to a venue on the map directly from the list
**Depends on**: Phase 18 (v1.3 complete)
**Requirements**: FILTER-01, UI-19, UI-20, UI-21, DATA-08
**Success Criteria** (what must be TRUE):
  1. The list card right-side shows a venue photo when image_url is set in Supabase; a sport-colored or grey placeholder appears when image_url is null
  2. A "Kertakäynti OK" filter button exists and limits the list to venues where drop-in visits are possible; price filters are removed
  3. Tapping the pin icon button on a list card closes the list, centers the map on that venue's coordinates, and opens the venue callout card
  4. The bottom sheet AI widget occupies more visible space at the top; ad/sponsor cards are visually smaller than before
  5. The image_url column exists in the paikat table in Supabase and an admin can populate it manually
**Plans**: TBD
**UI hint**: yes

### Phase 20: Navigaatio-korjaukset
**Goal**: Navigation between the map, list, and venue profiles is consistent and predictable — back returns to the right scroll position, map centering uses venue coordinates, and the bottom sheet animates open gracefully on load
**Depends on**: Phase 19
**Requirements**: NAV-01, NAV-02, NAV-03, NAV-04, NAV-05
**Success Criteria** (what must be TRUE):
  1. Pressing "Takaisin hakemistoon" from a venue profile page returns the user to the list at their previous scroll position, not the top
  2. Tapping "Näytä kartalla" centers the map on the venue's own coordinates without triggering GPS re-center; the bottom sheet stays closed
  3. The homepage loads with the bottom sheet closed, then the sheet animates open automatically and immediately without user interaction
  4. The toolbar on /suosikit and /profiili pages contains no search button and matches the homepage toolbar layout
  5. The "Takaisin" button on the TO DO page navigates to a valid destination (not the removed /?nakyma=lista route)
**Plans**: 2 plans
Plans:
- [x] 20-01-PLAN.md — Remove NavPill Haku link (NAV-04) and fix SuosikitClient back-links (NAV-05)
- [x] 20-02-PLAN.md — Bottom sheet auto-open animation (NAV-03) and scroll+state restore on back-nav (NAV-01); confirm NAV-02 no-op
**UI hint**: yes

### Phase 21: TO DO -lista
**Goal**: The favorites system is fully replaced by a TO DO list — bookmark icon system-wide, and the /suosikit page functions as a "places I want to visit" list
**Depends on**: Phase 20
**Requirements**: TODO-01, TODO-02
**Success Criteria** (what must be TRUE):
  1. The heart icon is replaced by a bookmark icon in HeartButton and on all pages where it appears; all UI labels read "TO DO" or equivalent Finnish text
  2. A logged-in user can view their saved venues on the /suosikit page as a TO DO list
  3. A logged-out user visiting /suosikit is prompted to log in
**Plans**: TBD
**UI hint**: yes

### Phase 22: Profiili & AI-kiinnostukset
**Goal**: Users can declare sport interests on their profile and receive AI recommendations that reflect those interests
**Depends on**: Phase 21
**Requirements**: PROFILE-01, PROFILE-02
**Success Criteria** (what must be TRUE):
  1. A logged-in user can select multiple sport interests (from lib/lajit.ts) on their /profiili page and the selections persist across sessions
  2. The AI weather recommendation prompt includes the user's sport interests when they are set
  3. A user with no interests set receives the same AI recommendation as before (no regression in output quality)
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
| 19. Filtteri, lista & paikka-UX | v1.4 | 0/? | Not started | - |
| 20. Navigaatio-korjaukset | v1.4 | 2/2 | ✅ Complete | 2026-05-30 |
| 21. TO DO -lista | v1.4 | 0/? | Not started | - |
| 22. Profiili & AI-kiinnostukset | v1.4 | 0/? | Not started | - |
