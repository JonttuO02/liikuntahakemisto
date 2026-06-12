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
- 🔄 **v2.0 Business UX & Navigation** — Phases 41–43 (active)

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

### v2.0 Business UX & Navigation (Phases 41–43) — ACTIVE

- [ ] **Phase 41: Navigation Foundation** — BusinessNav component + consumer NavBar hidden on /business/* + post-login redirect *(2 plans: Wave 1×1 + Wave 2×1)*
- [ ] **Phase 42: Dashboard & Map** — /business dashboard redesign (status card + venue list + actions) + /business/map new route
- [ ] **Phase 43: Business Profile** — /business/profiili page: read-only account info, editable contact fields, language toggle, sign-out

---

## Phase Details

### Phase 41: Navigation Foundation
**Goal**: Business users can navigate the /business/* area through a dedicated nav bar, and consumer nav is fully absent from that area
**Depends on**: Phase 40 (auth separation complete; createBusinessBrowserClient / createBusinessServerClient in place)
**Requirements**: BIZNAV-01, BIZNAV-02, BIZUX-02
**Success Criteria** (what must be TRUE):
  1. A business user on any /business/* page sees a BusinessNav bar with links to Dashboard, Kartta, Profiili, and a sign-out action
  2. The consumer NavBar does not appear on any /business/* page — no double-nav visible at any breakpoint
  3. After a successful login at /business/kirjaudu, the user lands on /business (not left at the login page)
  4. Navigating directly to /business/kirjaudu while already logged in redirects to /business immediately
**Plans**: 2 plans (Wave 1 → Wave 2)
**Wave 1**
- [ ] 41-01-PLAN.md — i18n keys + BusinessNav component
**Wave 2** *(blocked on Wave 1 completion)*
- [ ] 41-02-PLAN.md — layout wiring + kirjaudu RSC redirect
**UI hint**: yes

### Phase 42: Dashboard & Map
**Goal**: Business users have a useful dashboard home and a standalone map to explore venues
**Depends on**: Phase 41 (BusinessNav wraps all pages; redirect delivers users to /business)
**Requirements**: BIZUX-03, BIZUX-04
**Success Criteria** (what must be TRUE):
  1. The /business dashboard shows a card reflecting the current approval state (pending / approved / rejected) with a reapply CTA when rejected
  2. The dashboard lists the business's venues with per-venue status badges (pending / approved / rejected)
  3. The dashboard has quick-action links to the map (/business/map) and to each venue's edit wizard
  4. /business/map renders a full-screen map showing all published venues
  5. A pill toggle on /business/map switches between "Kaikki paikat" and "Omat paikat", filtering pins to the business's own venues
  6. Tapping a map pin on /business/map opens PaikkaSheet for that venue
**Plans**: TBD
**UI hint**: yes

### Phase 43: Business Profile
**Goal**: Business users can view their account details, update contact information, switch the UI language, and sign out from a dedicated profile page
**Depends on**: Phase 41 (BusinessNav present; business auth session accessible via createBusinessBrowserClient)
**Requirements**: BIZPRO-01, BIZPRO-02, BIZPRO-03, BIZPRO-04
**Success Criteria** (what must be TRUE):
  1. /business/profiili displays company name, email address, and account type as read-only fields
  2. A business user can edit phone, email, and website fields and save them; changes persist in business_accounts after a page reload
  3. A FI/EN toggle on /business/profiili sets the NEXT_LOCALE cookie and the UI language changes immediately without a full navigation
  4. Clicking sign-out clears the sb-biz-* session cookies and redirects the user to /business/kirjaudu; the consumer session is unaffected
**Plans**: TBD
**UI hint**: yes

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
| 41. Navigation Foundation | v2.0 | 0/? | Not started | - |
| 42. Dashboard & Map | v2.0 | 0/? | Not started | - |
| 43. Business Profile | v2.0 | 0/? | Not started | - |
