# ROADMAP — Liikuntahakemisto

## Milestones

- ✅ **v1.0 MVP** — Phases 1–5 (shipped 2026-05-21)
- ✅ **v1.1 Käyttäjät, Kartta & Laatu** — Phases 6–11 (shipped 2026-05-27)
- ✅ **v1.2 UI-uudistus & Arvostelut** — Phases 12–15 (shipped 2026-05-28)
- ✅ **v1.3 AKTIIVI — Redesign & Polish** — Phases 16–18 (shipped 2026-05-30)
- ✅ **v1.4 UX-parannukset & Profiili** — Phases 19–22 (shipped 2026-05-31)
- ✅ **v1.5 Visuaalinen elävöitys & UX-hienosäätö** — Phases 23–26 (shipped 2026-06-02)
- ✅ **v1.6 Kielituki, Ikonit & Sheet-redesign** — Phases 27–30 (shipped 2026-06-04)
- 🔄 **v1.7 Yritysportaali** — Phases 31–36 (active)

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

## v1.7 Yritysportaali (Phases 31–36)

- [x] **Phase 31: DB-skeema & Storage-perusta** — business_accounts, business_paikka_links, business_managed, business-media bucket ja RLS (4/4 plans)
- [x] **Phase 32: Yritysrekisteröinti & auth** — Rekisteröintilomake, kirjautuminen, automaattinen ohjaus /business-sivulle
 (completed 2026-06-05)
- [x] **Phase 33: Claim & paikan luonti** — Olemassa olevan paikan haku + claim-pyyntö; uuden paikan luonti; näkyvyyssäännöt (completed 2026-06-06)
- [x] **Phase 34: Onboarding-velhou** — 6-vaiheinen ohjattu wizard (paikka → mediat → hinnasto → aukioloajat → yhteystiedot → esikatselu) *(10 plans, 6 waves)* (completed 2026-06-10)
- [x] **Phase 35: Admin-hyväksyntäjärjestelmä** — Email-ilmoitukset, /admin-sivu, hyväksy/hylkää toiminto, vahvistussähköpostit, is_admin-suojaus *(11 plans, 4 waves)* (completed 2026-06-10)
- [x] **Phase 36: Hallintapaneeli** — /business-sivu: paikkalistaus tiloineen, kaikkien tietojen muokkaus, esikatselu (completed 2026-06-10)

---

## Phase Details

### Phase 31: DB-skeema & Storage-perusta
**Goal**: Tietokantaskeema ja tallennus on valmis kaikkia yritystoimintoja varten — yksikään myöhempi vaihe ei voi edetä ilman tätä pohjaa
**Depends on**: Phase 30 (v1.6 complete)
**Requirements**: BIZ-02, DATA-09, DATA-10
**Success Criteria** (what must be TRUE):
  1. `business_accounts`-taulu ja `business_paikka_links`-liitostaulu ovat olemassa Supabasessa oikeilla foreign key -suhteilla
  2. `liikuntapaikat`-taululla on `business_managed`-boolean-sarake; sync-skripti ohittaa rivit joissa `business_managed = true`
  3. `business-media` Supabase Storage -bucket on olemassa; RLS-politiikka sallii kirjoittamisen vain paikalle oikeuden omaavalle yritykselle (`business_paikka_links`-liitoksen kautta)
  4. Kaikki uudet taulut ovat RLS-suojattuja — anon-avaimella ei pysty lukemaan tai kirjoittamaan muiden yritysten tietoja
**Plans**: 4 plans in 2 waves

**Wave 1** (parallel):
- [x] 31-PLAN-01.md — business_accounts + business_paikka_links tables + RLS (BIZ-02)
- [x] 31-PLAN-02.md — business_managed + is_admin columns + Storage bucket SQL (DATA-09, DATA-10)
- [x] 31-PLAN-03.md — sync-paikat pre-filter + unit tests (DATA-09)

**Wave 2** *(blocked on Wave 1 completion)*:
- [x] 31-PLAN-04.md — [BLOCKING] supabase db push + manual Storage + is_admin checkpoint (BIZ-02, DATA-09, DATA-10)

**Cross-cutting constraints:**
- All migrations use `liikuntapaikat` (not `paikat`) — verified from sync route source
- Storage RLS uses `SECURITY DEFINER` function for `business_paikka_links` ownership check
- `objects.name` qualification required in all Storage policies

### Phase 32: Yritysrekisteröinti & auth
**Goal**: Yritys pystyy luomaan tilin ja kirjautumaan sisään, jonka jälkeen se ohjataan suoraan hallintapaneeliin
**Depends on**: Phase 31
**Requirements**: BIZ-01, BIZ-03
**Success Criteria** (what must be TRUE):
  1. Yritys täyttää rekisteröintilomakkeen (yritysnimi, sähköposti, salasana) ja tili luodaan Supabase Auth -järjestelmään linkitettynä `business_accounts`-riviin
  2. Yrityksen kirjautuessa olemassa olevalla tilillä se ohjataan automaattisesti `/business`-hallintapaneeliin eikä tavalliseen käyttäjänäkymään
  3. Tavallinen käyttäjä ei ohjaudu `/business`-sivulle — ohjaus tapahtuu vain kun `business_accounts`-rivi on olemassa
**Plans**: 3 plans in 2 waves

**Wave 1** (parallel):
- [x] 32-01-PLAN.md — i18n Business namespace (fi.json + en.json) + /business stub page (BIZ-01, BIZ-03)
- [x] 32-02-PLAN.md — /api/business/register Route Handler with JWT verification + atomicity rollback (BIZ-01)

**Wave 2** *(blocked on Wave 1 completion)*:
- [x] 32-03-PLAN.md — /business/rekisteroidy registration page + AuthModal SIGNED_IN business redirect (BIZ-01, BIZ-03)

**Cross-cutting constraints:**
- JWT from Authorization header verified via `supabaseAdmin.auth.getUser(token)` before trusting client-supplied user_id
- Business redirect check uses `.maybeSingle()` — returns null (not error) when no business_accounts row
- AuthModal: only SIGNED_IN useEffect modified — signup handleSubmit branch unchanged

### Phase 33: Claim & paikan luonti
**Goal**: Yritys pystyy joko ottamaan haltuunsa olemassa olevan paikan tai luomaan uuden, ja näkyvyyssäännöt toimivat oikein
**Depends on**: Phase 32
**Requirements**: CLAIM-01, CLAIM-02, CLAIM-03
**Success Criteria** (what must be TRUE):
  1. Yritys voi hakea olemassa olevaa paikkaa nimellä tai osoitteella ja lähettää claim-pyynnön — paikka pysyy näkyvänä sovelluksen käyttäjille koko prosessin ajan
  2. Jos haulla ei löydy sopivaa paikkaa, yritys voi luoda uuden paikan manuaalisesti — uusi paikka tallennetaan `published = false` -tilassa eikä näy sovelluksessa ennen admin-hyväksyntää
  3. Sekä claim-pyyntö että uusi paikka yhdistyvät yrityksen tiliin `business_paikka_links`-taulun kautta
**Plans**: 7 plans in 4 waves
Plans:
- [x] 33-01-PLAN.md — DB migration: published + is_claimed columns (CLAIM-03)
- [x] 33-02-PLAN.md — i18n: Business namespace Phase 33 keys (CLAIM-01, CLAIM-02)
- [x] 33-03-PLAN.md — API Route Handlers: claim-paikka + create-paikka (CLAIM-01, CLAIM-02, CLAIM-03)
- [x] 33-04-PLAN.md — published filter on app/page.tsx (CLAIM-03)
- [x] 33-05-PLAN.md — ClaimSearchForm client component (CLAIM-01, CLAIM-02)
- [x] 33-06-PLAN.md — /business/page.tsx server component replacement (CLAIM-01, CLAIM-02, CLAIM-03)
- [ ] 33-07-PLAN.md — [BLOCKING] supabase db push + smoke test
**UI hint**: yes

### Phase 34: Onboarding-velhou
**Goal**: Ensimmäistä kertaa kirjautunut yritys käy läpi 6-vaiheisen onboarding-velhon ja toimittaa kaikki tarvittavat tiedot hyväksyttäväksi
**Depends on**: Phase 33
**Requirements**: ONBOARD-01, ONBOARD-02, ONBOARD-03, ONBOARD-04, ONBOARD-05, ONBOARD-06, ONBOARD-07
**Success Criteria** (what must be TRUE):
  1. Ensimmäisellä kirjautumisella velhou käynnistyy automaattisesti eikä yritys pysty siirtymään hallintapaneeliin ennen kuin kaikki pakolliset vaiheet on täytetty
  2. Vaihe 1 (Paikka) esitäyttää paikan nimen ja osoitteen claim/luonti-valinnan perusteella; vaihe 2 (Mediat) lataa 1–5 kuvaa ja logon `business-media`-buckettiin edistymispalkin kera
  3. Vaihe 3 (Hinnasto) vaatii vähintään yhden hintarivin ennen kuin voi jatkaa; vaihe 4 (Aukioloajat) esitäyttää Google Places -datan jos saatavilla
  4. Vaihe 5 (Yhteystiedot) kerää puhelimen, sähköpostin, websiten ja kuvauksen (max 300 merkkiä); vaihe 6 (Esikatselu) näyttää PaikkaKortin, DiagonaalKortin ja PaikkaSheetin yrityksen syöttämillä tiedoilla
  5. Velhousta ei voi hypätä yli pakollisten vaiheiden — edistymispalkki ja navigointi kertovat missä vaiheessa ollaan
**Plans**: 10 plans in 6 waves

**Wave 0** (prerequisite — tests and utilities):
- [x] 34-01-PLAN.md — lib/onboardingUtils.ts + unit tests + vitest.config update (ONBOARD-04, -05, -06, -07)

**Wave 1** (parallel):
- [x] 34-02-PLAN.md — DB migration: onboarding_draft table + onboarding_completed column + RLS (ONBOARD-01, -03, -04, -05, -06, -07)
- [x] 34-03-PLAN.md — i18n wizard keys (fi.json + en.json) + ClaimSearchForm redirect fix + business/page.tsx onboarding gate (ONBOARD-01, -02)

**Wave 2** (after Wave 1 — migration must be applied before Route Handlers):
- [x] 34-04-PLAN.md — [BLOCKING] supabase db push + dashboard checkpoint (ONBOARD-01, -03, -04, -05, -06, -07)
- [x] 34-05-PLAN.md — Route Handlers: save-step + submit (atomic commit) (ONBOARD-01, -04, -05, -06, -07)

**Wave 3** (parallel — after Route Handlers):
- [x] 34-06-PLAN.md — Wizard page shell + OnboardingWizardInner + ProgressBar + StepPaikka (ONBOARD-01, -02)
- [x] 34-07-PLAN.md — UploadDropZone + UploadProgressBar + StepMediat (ONBOARD-03)

**Wave 4** (parallel — after Wave 3 scaffold):
- [x] 34-08-PLAN.md — StepHinnasto (Step 3) + StepAukioloajat (Step 4) + wired into wizard (ONBOARD-04, -05)
- [x] 34-09-PLAN.md — StepYhteystiedot (Step 5) + StepEsikatselu (Step 6 + submit) + all steps wired (ONBOARD-06, -07)

**Wave 10** (gap closure — after Wave 4):
- [x] 34-10-PLAN.md — PaikkaSheet preview prop + StepEsikatselu wire-up (ONBOARD-07)

**Wave 11** (UAT gap closure — after Wave 10):
- [x] 34-11-PLAN.md — Fix Step 6 spinner, ICU counter, back-nav data loss, thumbnail UX (ONBOARD-02, -04, -05, -06)

**UI hint**: yes

### Phase 35: Admin-hyväksyntäjärjestelmä
**Goal**: Admin voi tarkistaa, hyväksyä tai hylätä yritystililöinnit ja claim-pyynnöt, ja sekä yritys että admin saavat asianmukaiset sähköposti-ilmoitukset
**Depends on**: Phase 34
**Requirements**: ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04, ADMIN-05
**Success Criteria** (what must be TRUE):
  1. Uusi rekisteröityminen tai claim-pyyntö lähettää välittömästi sähköposti-ilmoituksen osoitteeseen joona.orava@gmail.com
  2. `/admin`-sivulla näkyy lista odottavista hakemuksista — admin näkee yrityksen tiedot, haetun paikan ja ladatut kuvat
  3. Admin voi hyväksyä hakemuksen yhdellä klikkauksella tai hylätä sen syy-tekstillä — molemmat toiminnot päivittävät hakemuksen tilan välittömästi
  4. Hyväksytty yritys saa vahvistussähköpostin; hylätty yritys saa sähköpostin jossa kerrotaan syy — molemmissa tapauksissa yritys tietää päätöksestä
  5. `/admin`-sivu näkyy vain käyttäjälle jonka `profiles`-taulussa on `is_admin = true` — kaikki muut saavat 404 tai unauthorized-vastauksen
**Plans**: 11 plans in 4 waves (9 original + 2 gap-closure)

**Wave 1** (parallel):
- [x] 35-01-PLAN.md — DB migration: rejection_reason + role_in_company (D-07, D-04)
- [x] 35-02-PLAN.md — i18n: Admin namespace + Business role keys (fi.json + en.json)
- [x] 35-03-PLAN.md — npm install resend + lib/email.ts email helpers (ADMIN-01, ADMIN-04)

**Wave 2** *(blocked on Wave 1 completion)*:
- [x] 35-04-PLAN.md — [BLOCKING] supabase db push + RESEND_API_KEY env + smoke test

**Wave 3** (parallel — after Wave 2):
- [x] 35-05-PLAN.md — Extend Route Handlers with email notifications + register role_in_company (ADMIN-01, D-04)
- [x] 35-06-PLAN.md — /api/admin/approve + /api/admin/reject Route Handlers (ADMIN-03, ADMIN-04, ADMIN-05)
- [x] 35-07-PLAN.md — UI: rekisteroidy role_in_company + business/page.tsx rejection display (D-04, D-08)

**Wave 4** (parallel — after Wave 3):
- [x] 35-08-PLAN.md — /admin/page.tsx Server Component + AdminApplicationList client (ADMIN-02, ADMIN-05)
- [x] 35-09-PLAN.md — /admin/[id]/page.tsx detail view with venue data + photos (ADMIN-02)
- [x] 35-10-PLAN.md — GAP A: logo_url migration + write in onboarding/submit + select in admin/[id] (ADMIN-02)
- [x] 35-11-PLAN.md — GAP B: POST /api/business/reapply + Hae uudelleen button rewire (ADMIN-03)

**UI hint**: yes

### Phase 36: Hallintapaneeli
**Goal**: Hyväksytyllä yrityksellä on täysin toimiva /business-hallintapaneeli omien paikkatietojensa ylläpitoon ja esikatseluun
**Depends on**: Phase 35
**Requirements**: BIZPANEL-01, BIZPANEL-02, BIZPANEL-03
**Success Criteria** (what must be TRUE):
  1. `/business`-sivu näyttää listan kaikista yrityksen paikoista ja kunkin tilan (pending / approved) — useamman paikan tili näyttää kaikki paikat listana
  2. Yritys pystyy muokkaamaan kaikkia onboarding-tietoja (kuvat, logo, hinnasto, aukioloajat, yhteystiedot) suoraan hallintapaneelista — muutokset astuvat voimaan välittömästi ilman erillistä hyväksyntäpyyntöä
  3. Hallintapaneelissa on esikatselu-näkymä joka näyttää miten paikka näyttää sovelluksen käyttäjille (PaikkaKortti, DiagonaalKortti, PaikkaSheet yrityksen datalla)
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
| 23. Visuaalinen perusta | v1.5 | 4/4 | ✅ Complete | 2026-06-01 |
| 24. Callout-kortti & ikonit | v1.5 | 1/1 | ✅ Complete | 2026-06-02 |
| 25. TO DO overlay | v1.5 | 2/2 | ✅ Complete | 2026-06-02 |
| 26. Filtterit | v1.5 | 2/2 | ✅ Complete | 2026-06-02 |
| 27. Siivous & pienet korjaukset | v1.6 | 5/5 | ✅ Complete | 2026-06-03 |
| 28. SVG-ikonit | v1.6 | 2/2 | ✅ Complete | 2026-06-03 |
| 29. Kortit & sheet redesign | v1.6 | 4/4 | ✅ Complete | 2026-06-04 |
| 30. i18n FI/EN | v1.6 | 4/4 | ✅ Complete | 2026-06-04 |
| 31. DB-skeema & Storage-perusta | v1.7 | 4/4 | ✅ Complete | 2026-06-05 |
| 32. Yritysrekisteröinti & auth | v1.7 | 3/3 | Complete    | 2026-06-05 |
| 33. Claim & paikan luonti | v1.7 | 7/7 | ✅ Complete | 2026-06-06 |
| 34. Onboarding-velhou | v1.7 | 11/11 | ✅ Complete | 2026-06-10 |
| 35. Admin-hyväksyntäjärjestelmä | v1.7 | 11/11 | ✅ Complete | 2026-06-10 |
| 36. Hallintapaneeli | v1.7 | 1/1 | Complete   | 2026-06-10 |
