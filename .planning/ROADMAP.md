# ROADMAP — Liikuntahakemisto

## Milestone 1: v1 Launch

### Phases

- [x] **Phase 1: Foundation & Security** — Fix critical bugs, lock down APIs, migrate schema
- [x] **Phase 2: Map & GPS** — Complete map UX with real GPS and distance display
- [x] **Phase 3: Data Enrichment** — Opening hours, multi-sport coverage, manual pricing
- [x] **Phase 4: Service Information UI** — Surface enriched data on cards and detail pages
- [x] **Phase 5: AI Weather Widget** — Differentiating AI recommendation feature (completed 2026-05-21)

---

## Phase Details

### Phase 1: Foundation & Security
**Goal:** The app is safe to ship — APIs are protected, routing works everywhere, data model is ready for all v1 features
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** SEC-01, SEC-02, SEC-03, SEC-04, DATA-04, ADS-01
**Success Criteria:**
1. A request to `/api/hae-paikat` without the correct Authorization header returns a 401 — no Google Places quota is consumed by anonymous callers
2. Tapping the Kartta tab in BottomNav, typing `?nakyma=kartta` directly in the browser, or navigating from any page all land on the same map view without a blank screen or console error
3. Connecting to Supabase with the anon key allows reading venue rows but rejects any insert, update, or delete attempt
4. Navigating to a broken route or triggering a runtime error shows a friendly Finnish error page, not a Next.js stack trace or blank screen
5. The Supabase `paikat` table contains the columns `hinta_kuvaus text`, `aukioloajat jsonb`, `lajit_lista jsonb`, and `featured boolean` — existing rows are not broken by the migration
**Plans:** `.planning/phases/01-foundation-and-security/01-PLAN.md` (14 plans, P-01–P-13 + P-10b)
**UI hint:** yes

### Phase 2: Map & GPS
**Goal:** Users can find venues near their physical location on an interactive map that works without visual glitches
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** MAP-01, MAP-02, MAP-03
**Success Criteria:**
1. Tapping "Käytä sijaintiani" on mobile triggers the browser location prompt; after granting permission the map centers on the user's position and shows nearby venue pins
2. If location permission is denied or unavailable, the map silently centers on Tampere city center — no error message, no broken state
3. Every venue card in list and map view shows a distance string ("1,2 km") that updates when the user's location changes
4. The map renders without the double-load flash that occurred with the previous library — pins appear in a single paint cycle
**Plans:** `.planning/phases/02-map-and-gps/02-01-PLAN.md`, `02-02-PLAN.md`, `02-03-PLAN.md` (6 tasks, 3 waves)
**UI hint:** yes

### Phase 3: Data Enrichment
**Goal:** The venue database is comprehensive and accurate — opening hours are fetched automatically, the catalogue covers Tampere's main sport categories, and top venues have pricing data
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** DATA-01, DATA-02, DATA-03
**Success Criteria:**
1. Running the Places ingestion script for any venue populates the `aukioloajat` column in Supabase with structured weekly hours from Google Place Details
2. The database contains venues across at least 7 sport categories: kuntosali, padel, uinti, jooga, kiipeily, jääkiekko, and one additional category
3. The top 20 Tampere venues each have a non-null `hinta_kuvaus` value visible in the Supabase dashboard
**Plans:** `.planning/phases/03-data-enrichment/03-01-PLAN.md`, `03-02-PLAN.md` (3 tasks, 2 waves)

### Phase 4: Service Information UI
**Goal:** Users can see opening status and pricing directly on venue cards and get full detail on the profile page — no clicks required to answer "is it open?" and "how much does it cost?"
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** UI-01, UI-02, UI-03, UI-04
**Success Criteria:**
1. Every venue card that has opening hours data shows today's opening hours text without the user tapping anything
2. A venue card with a currently open venue shows a green "Auki nyt" badge; a closed venue shows "Suljettu"; tapping a filter button hides all closed venues from the list
3. Venues that allow drop-in visits show a "Kertakäynti OK" badge on their card
4. The venue profile page shows a full weekly opening hours schedule and the price description in readable Finnish text
**Plans:** 4 plans
Plans:
- [x] 04-01-PLAN.md — Vitest setup + lib/aukiolo.ts utility (getOpenStatus, formatGroupedHours) with TDD
- [x] 04-02-PLAN.md — PaikkaKortti.tsx: open status badge, drop-in badge, hinta_kuvaus price, CTA fix
- [x] 04-03-PLAN.md — LiikuntapaikatLista.tsx: "Auki nyt" filter toggle row with lenient mode
- [x] 04-04-PLAN.md — HoursTable.tsx (new) + profile page: grouped weekly hours Row + price update
**UI hint:** yes

### Phase 5: AI Weather Widget
**Goal:** The homepage shows a weather-aware sport recommendation in Finnish that loads without blocking the page and does not re-fetch on the same day
**Mode:** mvp
**Depends on:** Phase 4
**Requirements:** AI-01, AI-02, AI-03
**Success Criteria:**
1. On first visit the homepage shows a static placeholder immediately, then replaces it with a Finnish-language sport recommendation that references today's weather (e.g. "Tänään sataa — hyvä päivä sisäliikuntalajille")
2. Reloading the page within the same day shows the AI recommendation instantly from cache — no network request to Claude API is made
3. If the Claude API or Open-Meteo API fails, the widget falls back gracefully to a static default text — the rest of the page is fully usable
**Plans:** 2/2 plans complete
Plans:
- [x] 05-01-PLAN.md — Phase 4 bug fix (page.tsx select) + @anthropic-ai/sdk install + /api/saasuositus Route Handler
- [x] 05-02-PLAN.md — Etusivu.tsx: remove typewriter, add non-blocking AI fetch + sessionStorage cache
**UI hint:** yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Security | 14/14 | Complete | 2026-05-19 |
| 2. Map & GPS | 3/3 | Complete | 2026-05-21 |
| 3. Data Enrichment | 2/2 | Complete | 2026-05-21 |
| 4. Service Information UI | 4/4 | Complete | 2026-05-21 |
| 5. AI Weather Widget | 2/2 | Complete   | 2026-05-21 |
