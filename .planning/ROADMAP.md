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
- 🚧 **v2.2 Onboarding-tekoälyn parannukset** — Phases 47–51 (in progress)

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

### 🚧 v2.2 Onboarding-tekoälyn parannukset (Phases 47–51) — In Progress

**Milestone Goal:** Onboarding-velhon tekoälyanalyysi tuottaa parempaa dataa laajemmalla sivuston haulla, ja käyttäjä näkee/hyväksyy tulokset reaaliajassa — pienemmällä manuaalisella työllä.

- [x] **Phase 47: Skeema & monisivuinen scraper-putki** — Schema migration + multi-page crawl with re-validated SSRF guard + labeled multi-page Claude prompt
 (completed 2026-06-16)

- [~] **Phase 48: Logo-, väri- ja galleriavalinta** — Multi-candidate logo picker, 2-color swatch picker, validated PATCH route, gallery prefill (executed 2026-06-16; gap closure 48-04 pending — CR-01/CR-02)
- [x] **Phase 49: Esikatselu- ja kontrastikorjaukset** — Step 6 CalloutCard swap + shared contrast-safe logo primitive *(2 plans, Wave 1×2 parallel)* (completed 2026-06-17)
- [x] **Phase 50: Flow-uudelleenjärjestys & pikahyväksyntä** — StepPaikka before URL-analysis + quick-accept shortcut into admin queue (completed 2026-06-17)
- [x] **Phase 51: Live-esikatselu velhossa** — Shared live-preview state, desktop split-view, mobile toggle (completed 2026-06-18)

## Phase Details

### Phase 47: Skeema & monisivuinen scraper-putki

**Goal**: The AI analysis pipeline crawls a business website's pricing/hours/contact subpages (not just the homepage) and safely returns richer, labeled data to Claude — with the database shaped to store plural results.
**Depends on**: Nothing (builds on v2.1's existing `business_branding` table and scraper/analyzer/route pipeline)
**Requirements**: SCRAP-06, SCRAP-07, SCRAP-08, SCRAP-09, BRDDB-03, BRDDB-04, BRDDB-05
**Success Criteria** (what must be TRUE):

  1. When a business submits its website URL, the analysis follows same-origin links from the homepage to pricing/hours/contact subpages (capped at 3-5 pages) and the extracted hinnasto/aukioloajat reflect data found only on those subpages
  2. Every followed link and redirect is re-validated against the SSRF guard — a malicious or private-IP subpage link cannot be fetched even if discovered via a legitimate homepage
  3. The analysis can extract general page images (not just logo candidates) and store them for later gallery use
  4. `business_branding` rows can store multiple logo candidates, multiple image URLs, and separate background/accent color selections without schema errors
  5. Saving a `logo_type` value that matches the analyzer's actual enum output no longer fails a CHECK constraint
  6. Two venues analyzed under the same business account do not silently overwrite each other's branding row

**Plans**: 5 plans (Wave 1: 47-01 schema, 47-02 SSRF utils, 47-04 analyzer/prompt/screenshot; Wave 2: 47-03 scraper crawl; Wave 3: 47-05 route wiring)

- [x] 47-01-PLAN.md — Schema migration: plural columns + paikka_id backfill + composite UNIQUE (BRDDB-03/04/05); [BLOCKING] supabase db push
- [x] 47-02-PLAN.md — Shared SSRF validator + redirect-revalidating fetch wrapper (SCRAP-07)
- [x] 47-03-PLAN.md — Multi-page subpage crawl + gallery image extraction (SCRAP-06/09)
- [x] 47-04-PLAN.md — Verbatim prompt + array-based analyzer + Playwright homepage screenshot (SCRAP-08)
- [x] 47-05-PLAN.md — Route wiring: paikka_id scoping + ownership check + pipeline integration (BRDDB-05)

### Phase 48: Logo-, väri- ja galleriavalinta

**Goal**: A business owner can see every AI-found logo and color candidate, explicitly choose what represents their brand instead of the system silently auto-picking one, and can accept the AI's results immediately to submit for approval without stepping through the rest of the wizard.
**Depends on**: Phase 47 (requires plural `logo_candidates`/`image_urls`/color columns and multi-page image discovery)
**Requirements**: ONBOARD-14, ONBOARD-15, ONBOARD-16, ONBOARD-17, FLOW-02, FLOW-03
**Success Criteria** (what must be TRUE):

  1. When multiple logo candidates were found, the user sees them all and picks exactly one (the AI's top pick pre-selected, not silently final)
  2. The user picks 2 colors from the extracted palette — one assigned to background, one to accent — rather than the system auto-assigning a single color
  3. Images discovered on the business's website automatically appear as selectable options in the Mediat step's photo picker
  4. Submitting a logo/color selection that doesn't belong to that business's own stored analysis result is rejected by the server, not silently accepted
  5. After AI analysis (and logo/color selection) completes, the user can accept the results in one action and land directly in the admin approval queue without stepping through the remaining wizard screens
  6. A quick-accepted submission passes through the same ownership check, validation, and draft-cleanup logic as a normal full-wizard submission — there is no second, less-guarded write path

**Plans**: 4 plans (Wave 1: 48-01 contracts + PATCH route; Wave 2: 48-02 logo/color pickers + paikka_id wiring; Wave 3: 48-03 gallery picker + quick-accept; gap closure: 48-04 fix CR-01 step-skip + CR-02 role-aware color)

- [x] 48-01-PLAN.md — Reshape BrandingResult + buildBrandingPreview; new validated PATCH /api/business/branding route (ONBOARD-17)
- [x] 48-02-PLAN.md — Logo + color pickers with autosave; fix paikka_id wiring in pre-vaihe (ONBOARD-14/15)
- [x] 48-03-PLAN.md — Gallery checkbox picker + Mediat prefill; quick-accept via unmodified submit route (ONBOARD-16, FLOW-02/03)
- [x] 48-04-PLAN.md — Gap closure: fix CR-01 (handleConfirm step:2→1 so wizard lands on Step 2/Media) + CR-02 (StepEsikatselu role-aware brandColor fallback) (ONBOARD-16, ONBOARD-14/15)

**UI hint**: yes
**Note (2026-06-16):** FLOW-02/FLOW-03 moved here from Phase 50 at user request — quick-accept submission belongs with the selection UI it accepts results from, in the same screen/step. Phase 50 retains only the step-reorder work (FLOW-01/FLOW-04).
**Note (2026-06-16, gap closure):** 48-VERIFICATION.md found 4/6 success criteria met. Criterion 3 (ONBOARD-16) and the phase goal's "explicit choice" clause failed due to CR-01 (step-skip) and CR-02 (non-role-aware color fallback). 48-04-PLAN.md closes both.

### Phase 49: Esikatselu- ja kontrastikorjaukset

**Goal**: What the business owner sees in the onboarding preview matches what will actually be published, and a white or transparent logo is never invisible against a white background anywhere in the app.
**Depends on**: Phase 48 (contrast fix is most useful once a user-selected background color exists, not just a generic neutral backdrop)
**Requirements**: PREV-02, PREV-03
**Success Criteria** (what must be TRUE):

  1. Step 6 of the onboarding wizard shows the same `CalloutCard` venues see live on the site, not the unused `PaikkaKortti` — and venues without coordinates still render a sensible fallback instead of breaking
  2. A white or transparent logo is visibly distinguishable in AnalysoiSivusto's logo-candidate picker (its only render site with a fixed white background and no contrast handling) because the picker uses a shared contrast-safe logo display primitive — DiagonaalKortti/PaikkaSheet already render logos safely via user-selected brand color and are unchanged (scope corrected 2026-06-17)

**Plans**: 2 plans (Wave 1: 49-01 contrast-safe logo primitive + picker wiring; 49-02 Step 6 CalloutCard swap + i18n — both parallel, zero file overlap)

- [x] 49-01-PLAN.md — Shared ContrastSafeLogo primitive + wire into AnalysoiSivusto logo-candidate picker (PREV-03)
- [x] 49-02-PLAN.md — Step 6 CalloutCard swap (with null-coordinate type shim) + previewLabelCallout i18n key (PREV-02)

**UI hint**: yes

### Phase 50: Flow-uudelleenjärjestys

**Goal**: A business owner identifies or creates their venue before being asked to analyze a website.
**Depends on**: Phase 47 (step-order change must not disturb the analysis flow it precedes)
**Requirements**: FLOW-01, FLOW-04
**Success Criteria** (what must be TRUE):

  1. A new business owner sees the venue-identification step (StepPaikka) before being asked for a website URL to analyze
  2. A business that started onboarding before this reorder shipped can resume their in-flight draft without getting stuck on a stale step number

**Plans**: 2 plans (Wave 1: 50-01 migration + bounds + [BLOCKING] push; Wave 2: 50-02 app-code reorder/renumber)

- [x] 50-01-PLAN.md — One-time step-renumber migration + tightened save-step bounds; [BLOCKING] supabase db push (FLOW-04)
- [x] 50-02-PLAN.md — StepPaikka pre-phase reorder + 5-step wizard renumber + progress bar (FLOW-01, FLOW-04)

**Note (2026-06-16):** FLOW-02/FLOW-03 (quick-accept) moved to Phase 48 at user request — see Phase 48's note.

### Phase 51: Live-esikatselu velhossa

**Goal**: A business owner sees their venue's card update in real time as they fill in any wizard step, instead of only seeing the final result at step 6 — in both the onboarding wizard and the existing-venue EditMode tabs.
**Depends on**: Phase 48, Phase 49 (live preview consumes the final logo/color selection shape and the corrected, contrast-safe preview component — building it earlier would mean rebuilding it)
**Requirements**: LIVEPREV-01, LIVEPREV-02, LIVEPREV-03, LIVEPREV-04
**Success Criteria** (what must be TRUE):

  1. Changing a field on any wizard step (name, price, hours, contact, logo, colors, photos) immediately updates a live preview without requiring a save or page reload
  2. On desktop, the live preview is visible side-by-side with the step currently being edited
  3. On mobile, the user can toggle between the edit form and the live preview instead of losing screen space to a permanent split view
  4. The live preview renders via `CalloutCard`/`DiagonaalKortti` using the current in-progress (unsaved) field values, not stale data from the last save
  5. EditMode's existing-venue tabs get the same live preview pattern, replacing the current click-to-open `PreviewModal`

**Plans**: 7/7 plans complete
**Wave 1**

- [x] 51-01-PLAN.md — Shared LivePreviewProvider/reducer + useDebouncedValue (LIVEPREV-01/04)
- [x] 51-05-PLAN.md — Gap closure (CR-01): unmount-time non-blob SET_MEDIA fallback in StepMediat so staged blob: URLs never go stale in the live preview (LIVEPREV-04)
- [x] 51-06-PLAN.md — Gap closure (WR-01): read the unmount fallback's media through a latestMediaRef so EditMode save-then-navigate dispatches post-save media, not the stale mount-time values (LIVEPREV-04)
- [x] 51-07-PLAN.md — Gap closure (CR-01, branding path): overlay live state.hinnasto/aukioloajat/yhteystiedot onto buildBrandingPreview's output in LivePreviewContext so AI-website-analysis-onboarded venues see live pricing/hours/contact edits, not frozen scraped/null data (LIVEPREV-01/02/03/04)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 51-02-PLAN.md — LivePreviewPane + LivePreviewToggle components + i18n keys (LIVEPREV-02/03/04)
- [x] 51-03-PLAN.md — Wire 4 step components to dispatch debounced/instant field updates (LIVEPREV-01/04)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 51-04-PLAN.md — WizardInner provider mount + desktop split/mobile toggle (both modes) + remove EditMode PreviewModal + D-03 REQUIREMENTS fix (LIVEPREV-02/03/04)

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

### Phase 51.1: Live preview on AnalysoiSivusto analyze/quick-accept results screen (INSERTED)

**Goal:** [Urgent work - to be planned]
**Requirements**: TBD
**Depends on:** Phase 51
**Plans:** 0 plans

Plans:

- [ ] TBD (run /gsd-plan-phase 51.1 to break down)
