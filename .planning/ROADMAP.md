# ROADMAP — Liikuntahakemisto

## Milestones

- ✅ **v1.0 MVP** — Phases 1–5 (shipped 2026-05-21)
- ✅ **v1.1 Käyttäjät, Kartta & Laatu** — Phases 6–11 (shipped 2026-05-27)
- ✅ **v1.2 UI-uudistus & Arvostelut** — Phases 12–15 (shipped 2026-05-28)
- 🔄 **v1.3 AKTIIVI — Redesign & Polish** — Phases 16–18 (active)

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

---

### v1.3 AKTIIVI — Redesign & Polish (Phases 16–18)

- [ ] **Phase 16: Brändi & Logo-uloke** — Rebrand to AKTIIVI, build the always-visible bottom sheet tab with animated SVG logo
- [ ] **Phase 17: Toolbar & Haku-UX** — Unify search + filters into one button; add dedicated list-toggle button
- [ ] **Phase 18: Kartan pinnit & korttianimaatio** — Unified pin color with sport SVG icons, same-address clustering, in-place card expansion

---

## Phase Details

### Phase 16: Brändi & Logo-uloke
**Goal**: The app is rebranded to AKTIIVI and users see an always-visible logo tab at the top of the bottom sheet that opens it with an animated gradient logo
**Depends on**: Phase 15 (v1.2 complete)
**Requirements**: BRAND-01, UI-13, UI-14, UI-15, UI-16
**Success Criteria** (what must be TRUE):
  1. Browser tab title, og:title, meta description, and manifest.json all show "AKTIIVI" — no "Liikuntahakemisto" visible in any metadata or installable PWA name
  2. A small tab/handle is always visible at the top of the bottom sheet even when the sheet is fully closed; tapping it opens the sheet
  3. The AKTIIVI SVG logo appears inside the tab when closed, and in the sheet header when the sheet is open
  4. Every time the sheet is opened, the logo text animates through a sporty gradient (cycles through 5 gradients: e.g. yellow-red, blue, pink, green, violet)
  5. After closing the sheet, reopening it shows the next gradient in the cycle — the logo does not reset to a default color between opens
**Plans**: TBD
**UI hint**: yes

### Phase 17: Toolbar & Haku-UX
**Goal**: Users can access search and filters from a single unified button, and toggle the venue list independently, from both map and list contexts
**Depends on**: Phase 16
**Requirements**: UI-17, UI-18
**Success Criteria** (what must be TRUE):
  1. There is exactly one button in the toolbar that opens both the search field and the filter panel together — no separate search-only or filter-only buttons
  2. That combined search+filter button works identically whether the user is in map view or list view
  3. There is a separate, clearly distinct button dedicated only to toggling the list view open and closed — it does not also trigger search or filters
**Plans**: TBD
**UI hint**: yes

### Phase 18: Kartan pinnit & korttianimaatio
**Goal**: The map uses visually unified pins differentiated by sport icon, groups co-located venues into clusters, and expands venue cards in-place on the map rather than in a bottom sheet
**Depends on**: Phase 17
**Requirements**: MAP-08, MAP-09, MAP-10
**Success Criteria** (what must be TRUE):
  1. All map pins use the same base color; the sport type is communicated only by a custom SVG icon rendered inside the pin — no per-sport pin color variation
  2. Multiple venues sharing the same address appear as a single cluster pin; tapping the cluster pin shows a list of all venues at that address
  3. Tapping a pin or its mini-card causes that card to animate and expand in-place on the map into a full detail card; the map remains centered on that venue throughout the animation
  4. No bottom-sheet card slides up from the bottom when a pin is tapped — the entire interaction is map-layer only
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
| 16. Brändi & Logo-uloke | v1.3 | 3/? | In progress | - |
| 17. Toolbar & Haku-UX | v1.3 | 0/? | Not started | - |
| 18. Kartan pinnit & korttianimaatio | v1.3 | 0/? | Not started | - |
