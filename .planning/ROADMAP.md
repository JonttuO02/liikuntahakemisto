# ROADMAP — Liikuntahakemisto

## Milestones

- ✅ **v1.0 MVP** — Phases 1–5 (shipped 2026-05-21)
- 🔄 **v1.1 Käyttäjät, Kartta & Laatu** — Phases 6–11 (active)

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

### v1.1 Phases

- [ ] **Phase 6: UI Polish & Data Foundation** — Tighten card UI, add GDPR page, sponsored badge, city filter, AI widget city name
- [ ] **Phase 7: Map Infrastructure** — Migrate to AdvancedMarker, add mapId env var, implement re-center button
- [ ] **Phase 8: Map Features** — GPS accuracy ring, zoom-dependent pin-to-card, in-app map focus
- [ ] **Phase 9: Auth & Favorites** — Supabase Auth (email + Google OAuth), favorites synced across devices, personalized AI
- [ ] **Phase 10: City Expansion** — Helsinki and Turku data via Google Places sync
- [ ] **Phase 11: PWA** — Service worker with offline support and home screen install prompt

---

## Phase Details

### Phase 6: UI Polish & Data Foundation
**Goal**: Users see tighter card information, a legal privacy page, sponsored badges, and can filter by city
**Depends on**: Nothing (zero new packages, pure UI and schema work)
**Requirements**: LEGAL-01, ADS-02, AI-04, UI-05, UI-06, UI-07, UI-08, DATA-07
**Success Criteria** (what must be TRUE):
  1. User can navigate to `/tietosuoja` and read the GDPR privacy policy before logging in
  2. Featured venues show a "Sponsoroitu" badge on both list cards and map pins
  3. List card shows a single-select sport dropdown instead of pill filters
  4. Card displays walk-in price at the top if available, or the text "vain jäsenyys"; "Varaa aika" button is absent from list cards
  5. AI widget shows the city name next to the temperature reading
  6. User can filter venues by city using a city selector in the UI
**Plans:** 7 plans
  - [x] 06-01-PLAN.md — Add featured column to SELECT (ADS-02 data unblock)
  - [x] 06-02-PLAN.md — Create /tietosuoja GDPR page (LEGAL-01)
  - [x] 06-03-PLAN.md — Replace Varaa aika button with Varaussivu Row on profile page (UI-07 profile half)
  - [x] 06-04-PLAN.md — TDD lib/priceUtils.ts and lib/cityFilter.ts helpers (UI-05/DATA-07 logic + tests)
  - [x] 06-05-PLAN.md — PaikkaKortti: Sponsoroitu badge, price-at-top, Näytä tiedot CTA (ADS-02/UI-05/UI-06/UI-07 list half)
  - [x] 06-06-PLAN.md — LiikuntapaikatLista: sport dropdown, city dropdown, Tietosuoja footer (UI-08/DATA-07/LEGAL-01 wiring)
  - [x] 06-07-PLAN.md — Etusivu: WEATHER_CITY label + bottom-sheet Sponsoroitu badge (AI-04/ADS-02 map half)
**UI hint**: yes

### Phase 7: Map Infrastructure
**Goal**: The map uses AdvancedMarker throughout, enabling all upcoming map feature work
**Depends on**: Phase 6
**Requirements**: MAP-04
**Success Criteria** (what must be TRUE):
  1. Both map instances (preview and fullscreen) render markers correctly after the AdvancedMarker migration
  2. A re-center button is visible on the map; tapping it moves the map view back to the user's GPS position
  3. `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` environment variable is documented and the Map components pass `mapId`
**Plans**: TBD
**UI hint**: yes

### Phase 8: Map Features
**Goal**: The map shows rich contextual information at close zoom and links directly from venue detail pages
**Depends on**: Phase 7
**Requirements**: MAP-05, MAP-06, MAP-07
**Success Criteria** (what must be TRUE):
  1. The user's location marker displays a translucent accuracy ring that reflects GPS precision
  2. At normal zoom the map shows pin icons; zooming in past the threshold transforms each pin into a small card showing name, sport, and price
  3. Tapping "Näytä kartalla" on a venue detail page opens the app's own map view centered and zoomed on that venue — no navigation to Google Maps
**Plans**: TBD
**UI hint**: yes

### Phase 9: Auth & Favorites
**Goal**: Users can create accounts, save favorites that persist across devices, and receive personalized AI recommendations
**Depends on**: Phase 6 (LEGAL-01 must be live before auth ships)
**Requirements**: AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. User can sign up and sign in with email/password or Google OAuth without leaving the app
  2. A signed-in user can heart/un-heart any venue; favorites persist when switching devices or browsers
  3. The AI weather recommendation references the user's saved favorites when they are signed in
  4. Signed-out users can browse the full directory without being prompted or gated
**Plans**: TBD
**UI hint**: yes

### Phase 10: City Expansion
**Goal**: Helsinki and Turku venues are in the database and discoverable alongside Tampere
**Depends on**: Phase 6 (DATA-07 city field and UI must exist before multi-city data is useful)
**Requirements**: DATA-05, DATA-06
**Success Criteria** (what must be TRUE):
  1. Helsinki-area sports venues appear in the listing and on the map when Helsinki is selected as the city filter
  2. Turku-area sports venues appear in the listing and on the map when Turku is selected as the city filter
  3. Syncing Helsinki or Turku data does not overwrite or corrupt existing Tampere venue records
**Plans**: TBD

### Phase 11: PWA
**Goal**: The app is installable and shows cached content when the device is offline
**Depends on**: Phase 9 (complete API surface needed for caching strategy)
**Requirements**: PWA-01, PWA-02
**Success Criteria** (what must be TRUE):
  1. A user on Android or iOS can add the app to their home screen via a browser install prompt or share sheet
  2. After at least one online visit, the listing page loads and shows previously cached venue cards without a network connection
  3. Service worker does not break client-side navigation or RSC requests in production
**Plans**: TBD

---

## Progress Table

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|---------------|--------|-----------|
| 1. Foundation & Security | v1.0 | 14/14 | ✅ Complete | 2026-05-19 |
| 2. Map & GPS | v1.0 | 3/3 | ✅ Complete | 2026-05-21 |
| 3. Data Enrichment | v1.0 | 2/2 | ✅ Complete | 2026-05-21 |
| 4. Service Information UI | v1.0 | 4/4 | ✅ Complete | 2026-05-21 |
| 5. AI Weather Widget | v1.0 | 2/2 | ✅ Complete | 2026-05-21 |
| 6. UI Polish & Data Foundation | v1.1 | 7/7 | human_needed | 2026-05-22 |
| 7. Map Infrastructure | v1.1 | 0/? | Not started | - |
| 8. Map Features | v1.1 | 0/? | Not started | - |
| 9. Auth & Favorites | v1.1 | 0/? | Not started | - |
| 10. City Expansion | v1.1 | 0/? | Not started | - |
| 11. PWA | v1.1 | 0/? | Not started | - |
