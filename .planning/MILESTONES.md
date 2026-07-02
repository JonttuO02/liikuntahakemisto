# Milestones — Liikuntahakemisto

## v3.1 UX/UI-korjaukset & business-parannukset (Shipped: 2026-07-02)

**Phases completed:** 7 phases, 33 plans, 62 tasks

**Key accomplishments:**

- Read-only interactive Sijainti map on /admin/[id] with a zoom-driven pin↔CalloutCard transition, matching the main map's behavior after fixing a real overflow:hidden + CSS filter compositing bug.
- human-verify (blocking gate, `gate="blocking"` per plan frontmatter Task 3) — RESOLVED
- human-action (blocking gate, `gate="blocking"` per plan frontmatter Task 4) — RESOLVED
- business_access_requests-taulu RLS:llä (2 SELECT + 1 INSERT, ei UPDATE-polkua), D-08 osittainen UNIQUE-indeksi idempotenssia varten ja business_accounts.company_id nollattavaksi (D-09a) — pushattu live-Supabaseen
- Kaksi uutta Resend-sähköpostifunktiota hallintaoikeuspyynnoille — omistajailmoitus saapuvasta pyynnöstä ja päätösilmoitus pyytäjälle — käyttäen sub()/esc()-suojauksia (T-60-05/T-60-06).
- D-08/D-09/D-10 access-request submit endpoint with idempotent insert and venue-scoped owner notification email; register endpoint extended with invite-link path (company_id=NULL, role='member') per D-09a.
- 1. [Rule 2 - Missing functionality] Pending banner in both render branches
- Kaksi uutta pre-wizard-askelta (nimi+URL, sijainti) sekä SijaintiPickerin poisto ClaimSearchFormista — lokalisointiin perustuvat uudet avaimet jo lisätty Plan 01:ssä.
- Onboarding wizard supistettiin 5 askeleesta 4:ään siirtämällä submit-logiikka StepEsikatselu:sta StepYhteystiedot:iin ja poistamalla erillinen esikatselu-askel.
- Task 1 — Add disableDefaultUI and custom location pin to SijaintiPicker
- Added a conditional "Näytä kartalla" SheetRow (MapPin icon, `/?id=X` anchor) to PaikkaSheet plus matching `location`/`showOnMap` i18n keys in fi+en, completing the content-migration prerequisite for deleting `app/paikat/[id]`
- Replaced DiagonaalKortti's invisible `next/link` navigation overlay with a prop-conditional `onOpen` callback div — interactive when wired by a consumer, inert no-op in preview contexts.
- Completed the venuepage consolidation: both DiagonaalKortti card sites now open PaikkaSheet inline (dismissing the relevant overlay first), `app/paikat/[id]` is deleted so the route auto-404s, and the orphaned `PaikkaPage` i18n namespace is gone from both message files.
- Removed two one-line state mutations in Etusivu.tsx so PaikkaSheet layers over the search results list and TO DO overlay (via existing z-index stacking) instead of unmounting them; reconciled UAT Test 1's wording with the corrected behavior.
- Extracted darkenHex/lightenHex from CalloutCard into a shared brandingResult.ts module and added getPanelShade(brandColor) — a YIQ-based complementary-shade helper for the dashboard controls-panel background (D-03).
- PreviewModal swapped PaikkaKortti for CalloutCard, LivePreviewPane gained a third PaikkaSheet(preview) section, and PaikkaSheet's booking link is now gated on `!preview` across every preview surface.
- update-paikka now auto-flips a rejected venue's claim_status back to pending on any successful section save, concurrency-guarded and never trusting client input, with 17 Vitest cases (14 existing + 3 new) all green.
- Built the `dashboardActions` prop bundle on `DiagonaalKortti` (permanent icon-button controls panel + status pill, replacing the right photo panel) and a new `RejectionReasonPopup` component, both in isolation ahead of Plan 05's wiring into `/business`.
- Replaced /business dashboard's plain-text VenueRow/StatusCard reapply UI with DiagonaalKortti dashboardActions cards and a single page-level RejectionReasonPopup; deleted the now-dead /api/business/reapply route.
- Fixed-width (396px) non-stretching dashboard card grid, neutral-gray controls-panel fallback, genuine copy-link confirmation, and a full end-to-end fix for brand colors never actually persisting from onboarding to the dashboard/preview.
- Fixed the wizard's "Analysoi ->" button to actually start analysis, hardened the pipeline against Vercel's ~10s waitUntil kill with a controlled failure path, fixed a resumed-draft race condition, and fixed real-world bare-domain URLs (no protocol) being rejected outright by the SSRF guard.
- New service-role `GET /api/business/access-request/list` Route Handler returning a venue's pending access requests and current approved team with resolved identity, gated by venue-scoped owner authorization — the read side of ACCESS-04.
- New service-role `POST /api/business/access-request/remove` endpoint lets an approved venue owner DELETE a sub-manager's `business_paikka_links` row, with a server-side self-removal hard-block and venue-scoped authorization — TDD RED/GREEN, six Vitest cases, no email notification (D-11).
- Added business_accounts.display_name (TEXT, service-role-write-only) and repaired the invite-link signup round-trip so new invite-link employees become pending members of the inviting venue instead of owners of a bogus new company.
- TeamManagementPopup gives venue owners a single Users-icon-triggered dialog to approve/reject pending access requests and remove sub-managers, gated by a D-02 render-time visibility check reusing the existing service-role list endpoint.
- Pure `pendingRowToTeamMember` mapper wired into `handleApprove` so the approved member moves from "Pending requests" to "Current team" in the same render pass, closing UAT Test 3's stale-list gap.

---

## v3.0 Oma tietokanta (Google Places -irtautuminen) (Shipped: 2026-06-24)

**Phases completed:** 6 phases, 13 plans, 13 tasks

**Key accomplishments:**

- Verified CLEAN-06 (i18n coverage) and CLEAN-07 (mapError precedence fix) as already-satisfied with file+line/git evidence, and added a Vitest regression test guarding the (A || B) && C precedence grouping in both mapError and mapBusinessError.
- Task 1 — `supabase/migrations/20260622120000_remove_google_places_data.sql`
- The plan specified `PlaceAutocompleteElement` (Google's web-component widget) per D-04. Live browser verification found it threw `TypeError: Cannot read properties of undefined (reading 'keys')` on every construction attempt, reproducible identically on both the default and `beta` Maps JS channels. Root-caused via the `visgl/react-google-maps` maintainer's own GitHub guidance: the widget is alpha/beta-only and the maintainer recommends against using it, suggesting `AutocompleteSuggestion.fetchAutocompleteSuggestions()` instead. The crash only disappeared on `version="alpha"`, which Google explicitly disclaims as dev-only (visible banner, not shippable).
- Task 1 — Schema migrations.
- Task 1 — save-step ALLOWED_FIELDS + validation (TDD).
- Distinct laji suggestion card with Vahvista/Vaihda actions, a reusable 9-category LajiPicker shared by the Vaihda and D-06 skip-path flows, and save-step persistence wired into both the full-wizard and quick-accept paths.
- New `lib/normalizeNimi.ts` helper (casing-preserving, 200-char cap) plugged into a reworked `create-paikka` route that now accepts separate company/branch name fields, writes `business_accounts.company_name`, adds the missing `23505→409` conflict branch, and the now-orphaned `claim-paikka` route is deleted.
- `ClaimSearchForm.tsx` rewritten as a create-only form with two name fields (`yritysNimi` required, `toimipisteNimi` optional) wired to the 56-01 `create-paikka` contract, including 409 handling; both locale files updated with new name-field keys and reworded heading/error copy, with all claim/search-only keys removed.
- Removed the unconditional /business → /business/onboarding redirect and replaced it with a per-venue gray "Kesken" badge + "Jatka" resume CTA, driven by a unit-tested deriveVenueStatus precedence helper.

---

## v2.2 Onboarding-tekoälyn parannukset (Shipped: 2026-06-21)

**Phases completed:** 6 phases, 22 plans, 48 tasks

**Key accomplishments:**

- Additive Postgres migration adding four plural-branding columns and a NOT-NULL `paikka_id` FK with deterministic backfill, re-keying `business_branding`'s UNIQUE constraint to `(business_account_id, paikka_id)`, pushed live and verified with three SQL evidence queries.
- Extracted route.ts's inline SSRF check into a shared, pure `isUrlSafe(url)` validator and built a `fetchWithSsrfGuard` wrapper that re-validates every 3xx redirect hop against it with a 2-hop cap, closing the SSRF-via-redirect vector for the upcoming multi-page scraper.
- Extended scraper.ts from a single-page scrape into a same-origin multi-page crawler (homepage + up to 4 keyword-matched subpages) with labeled per-page output, gallery image extraction distinct from logo candidates, and every outbound fetch (page/subpage/CSS/logo-image) routed through the SSRF-guarded redirect-revalidating wrapper from Plan 47-02.
- Replaced the v2.1 branding prompt with the verbatim multi-page version, reshaped `analyzeWithClaude` to return array-based `logos`/`colors` with per-page `source_page` provenance and an optional homepage screenshot input, and added a fail-soft Playwright + `@sparticuz/chromium` screenshot module with Next.js 14.2 serverless-externalization config.
- Rewired `app/api/business/analyze-website/route.ts` to ownership-checked, `(business_account_id, paikka_id)`-scoped UPSERTs/queries, replaced the inline SSRF block with the shared `isUrlSafe` validator, and threaded the new multi-page scraper/analyzer/screenshot pipeline through `runAnalysis` — closing the integration gap left by Plans 47-01 through 47-04.
- Relaxed analyze-website's POST ownership check to ownership-only (unblocking the 'preview' phase for onboarding businesses), reshaped BrandingResult to mirror the plural GET response, and added a validated PATCH /api/business/branding autosave route enforcing logo/color/gallery membership checks.
- Reworked the onboarding pre-vaihe's read-only branding preview into interactive logo/color pickers with immediate PATCH autosave, and fixed the pre-existing paikka_id gap (Suspense-safe resolution) that was silently breaking every analyze-website call.
- Added an autosaving 5-cap gallery checkbox picker that reliably pre-fills the wizard's Mediat step (via an awaited save-step write that closes a draft-fetch race), and a "Hyväksy ja lähetä" quick-accept path that maps AI results + user selections into the existing onboarding_draft and reuses the unmodified submit route.
- Fixed two single-expression regressions: the onboarding wizard now lands on Step 2 (Media) after analysis instead of skipping past it, and the Step 6 preview background color is selected by semantic role instead of array position.
- `app/components/ContrastSafeLogo.tsx`
- One-time SQL migration decrementing in-flight onboarding_draft.current_step values, plus a reconciled 0-5 input bounds check in save-step/route.ts. Schema pushed to the live database by the orchestrator after the executor hit a credentials gate.
- StepPaikka moved to a page-level pre-phase before website analysis; wizard renumbered to 5 steps (StepMediat=1 ... StepEsikatselu=5); wizard step-1 back-button rewired to return to the analyze pre-phase after a UAT-caught dead-end bug.
- 1. [Rule 1 - Bug] Removed literal "PaikkaSheet" string from LivePreviewPane.tsx doc comment
- 1. [Rule 3 - Blocking issue] No literal Out-of-Scope exclusion row existed to remove for D-03
- Unmount-time SET_MEDIA dispatch in StepMediat clears staged blob: URLs from LivePreviewContext before the existing revocation effects fire, closing the CR-01/LIVEPREV-04 verification gap
- Added a latestMediaRef synced on every persisted-media change so StepMediat's unmount-only SET_MEDIA fallback dispatches post-save media instead of the stale mount-time snapshot (WR-01 gap closure for LIVEPREV-04).
- Branding branch of `livePreviewPaikka` now overlays live `state.hinnasto`/`state.aukioloajat`/`state.yhteystiedot` onto `buildBrandingPreview`'s AI-scraped base, fixing CR-01 so AI-website-analysis-onboarded venues see live pricing/hours/contact edits in the wizard preview.
- Extended StepPaikkaPrePhase's Supabase select to the full PaikkaBase column set and threaded the result through OnboardingWizardPage state into AnalysoiSivusto's new paikkaInfo prop.
- Wrapped AnalysoiSivusto's preview phase in its own LivePreviewProvider instance with the WizardInner desktop split / mobile toggle layout, syncing logo and gallery picks into the live CalloutCard/DiagonaalKortti preview via SET_MEDIA effects while colors flow through a brandingData override.

---

## v1.9 Auth-Separaatio & Cleanup — 2026-06-12

**Shipped:** 2026-06-12
**Phases:** 2 (phases 39–40) | **Plans:** 7
**Timeline:** 2026-06-11 → 2026-06-12 (2 days)
**Commits:** 86 | **Files changed:** 88 | **Lines:** +8872 / -331

### What Shipped

1. **Auth-sessioiden eristys** — `lib/supabase-business.ts` luo `createBusinessBrowserClient()` ja `createBusinessServerClient()` `sb-biz-*`-cookie-nimiavaruudella — consumer `sb-*` ja business `sb-biz-*` sessiot ovat täysin riippumattomia, molemmat voivat olla aktiivisina samanaikaisesti
2. **Middleware path-conditional refresh** — `/business/*`-reiteillä refreshataan `sb-biz-*`-cookie ja ohjataan kirjautumattomat `/business/kirjaudu`-sivulle; consumer-reiteillä refreshataan `sb-*`-cookie ilman ohjausta
3. **Dedikoitu business-kirjautumissivu** — `/business/kirjaudu` käyttää `createBusinessBrowserClient()`; token tallennetaan `sb-biz-*`-cookieen eikä kosketa consumer-sessiota
4. **Business-reittien migraatio** — kaikki `/business/*`-RSC-layoutit + `/api/business/*`- ja `/api/admin/*`-reitit käyttävät business-asiakasta; consumer-sessio ei vaikuta niihin
5. **WizardInner-konsolidointi** — `OnboardingWizardInner` ja `EditWizardInner` yhdistetty yhdeksi `app/business/WizardInner.tsx`-tiedostoksi (`mode: 'onboarding' | 'edit'`); duplikoitu logiikka poistettu
6. **Testitilien siivousmigraatio (CLEAN-01)** — CASCADE-migraatio luotu (`20260612000000_cleanup_test_accounts.sql`); vaatii manuaalisen `supabase db push`

### Known Deferred Items at Close

- CLEAN-01: Migraatio luotu mutta ei ajettu — ei ole oikeata tuotantodataa joka pitäisi suojata
- Post-review fixes CR-01/CR-02 (business/[id] omistajuustarkistus + submit paikka_id -filtteri) lisätty 2026-06-12

### Archives

- `.planning/milestones/v1.9-ROADMAP.md`
- `.planning/milestones/v1.9-REQUIREMENTS.md`

---

## v1.8 Yritysportaali v2 — Julkistaminen & UX — 2026-06-11

**Shipped:** 2026-06-11
**Phases:** 2 (phases 37–38) | **Plans:** 9
**Timeline:** 2026-06-11 (same-day hardening release on v1.7)

### What Shipped

1. **Tech Debt Foundation (Phase 37)** — RSC guard layoutit kaikille `/business/*`-reiteille; middleware redirect; `is_claimed`-kenttä; `onboarding_completed`-kolumni droppaaminen; wizard-auth-siivous
2. **Atomic Publication (Phase 38)** — Postgres AFTER UPDATE trigger atomiselle hyväksynnälle (`published=true` + `business_managed=true`); ennenaikaiset `business_managed`-kirjoitukset poistettu; `BadgeCheck`-verifikaatio-tikki PaikkaKortti/DiagonaalKortti/PaikkaSheet -korteissa

### Known Deferred Items at Close

- Phase 39 (original, Business User UX): BIZUX-02–05 siirretty — vaati auth-session eristyksen ensin (toteutettu v1.9:ssä). BIZUX-03 + BIZUX-04 jatkuu seuraavassa milestonessa.

### Archives

- `.planning/milestones/v1.8-ROADMAP.md`

---

## v1.7 Yritysportaali — 2026-06-11

**Shipped:** 2026-06-11
**Phases:** 6 (phases 31–36) | **Plans:** 44
**Timeline:** 2026-06-04 → 2026-06-11 (7 days)
**Commits:** 297 | **Files changed:** 63 | **Lines:** +7978 / -315

### What Shipped

1. **DB-skeema & Storage-perusta** — `business_accounts`, `business_paikka_links`, `business_managed`, `is_admin`, `business-media` Storage-bucket RLS:llä; Storage SECURITY DEFINER -funktiopaterni hosted Supabaselle
2. **Yritysrekisteröinti & auth** — `/business/rekisteroidy` rekisteröintilomake, JWT-varmennettu `/api/business/register`, AuthModal-ohjaus `/business`-sivulle kirjautuneille yrityksille
3. **Claim & paikan luonti** — Hae olemassa oleva paikka tai luo uusi; `published=false` uusille paikoille admin-hyväksyntään asti; `is_claimed`-kenttä; smoke-testi läpäisty
4. **6-vaiheinen onboarding-velhou** — Paikka → Mediat (S3-kuvat + logo) → Hinnasto → Aukioloajat → Yhteystiedot → Esikatselu; draft-persistointi Supabasessa; step-forward URL-suoja; image_url + logo_url pipeline
5. **Admin-hyväksyntäjärjestelmä** — Resend-sähköposti-ilmoitukset adminille ja yritykselle; `/admin`-sivu hakemuksineen; hyväksy/hylkää syyllä; Hae uudelleen -toiminto; is_admin-suojaus
6. **Hallintapaneeli** — `/business` paikkalistaus tilamerkein; koko edit-velhou kaikille paikkatiedoille; PreviewModal PaikkaKortti+DiagonaalKortti+PaikkaSheet esikatselulla

### Known Deferred Items at Close

- Phase 33 ja 36: puuttuu VERIFICATION.md (toteutus vahvistettu smoke test / UAT -testeillä)
- `claim-paikka`-reitti ei aseta `business_managed=true` — sync-ikkuna olemassa kunnes onboarding-submit ajaa
- Wizard-orkestraattorien duplikaatio (OnboardingWizardInner + EditWizardInner) — v1.8 siivous
- `/admin` ei server-side middlewarea — pelkkä client-side + API 403 -suojaus

### Archives

- `.planning/milestones/v1.7-ROADMAP.md`
- `.planning/milestones/v1.7-REQUIREMENTS.md`
- `.planning/v1.7-MILESTONE-AUDIT.md`

---

## v1.0 MVP — 2026-05-21

**Shipped:** 2026-05-21
**Phases:** 5 | **Plans:** 25
**Timeline:** 2026-05-18 → 2026-05-21 (3 days)
**Files changed:** 48 | **Lines:** +6640 / -580

### What Shipped

1. **Turvallinen perusta** — RLS-politiikat, API-autentikaatio, yhtenäinen URL-routaus, virhesivut
2. **Interaktiivinen GPS-kartta** — @vis.gl/react-google-maps, 3D preview → fullscreen, sport pins, käyttäjän sijaintimerkki
3. **Datakanta** — aukioloajat Google Places -haulla, hinnat manuaalisesti, 7+ lajikategoriaa
4. **Aukioloajat & hinnat UI** — lib/aukiolo.ts, "Auki nyt" badge + filter, HoursTable.tsx, profiilisivu
5. **AI-sääsuositus-widget** — Claude Haiku + Open-Meteo, ei-blokkaava, sessionStorage-cache

### Known Deferred Items at Close

- UAT testi 4 (AI sääkonteksti) ohitettu — vaatii Claude API -krediittejä
- Data ops manuaaliset: sync-paikat + seed-hinnat ei automatisoitu

### Archives

- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`

---

## v1.1 Käyttäjät, Kartta & Laatu — 2026-05-27

**Shipped:** 2026-05-27
**Phases:** 6 (phases 6–11) | **Plans:** 23
**Timeline:** 2026-05-21 → 2026-05-27 (6 days)
**Commits:** ~194

### What Shipped

1. **UI-polish & kaupunkifiltteri** — Sponsoroitu-badge, hinta kortin yläosaan, "Varaa aika" pois listalta, "vain jäsenyys" -teksti, lajifiltteri pudotusvalikko, kaupunkifiltteri, GDPR-tietosuojasivu, AI-widget kaupunki-label
2. **AdvancedMarker-migraatio + kartta-infra** — AdvancedMarker kaikilla karttoilla, day/night mapId -vaihto, RecenterButton
3. **Karttaominaisuudet + bottom sheet -arkkitehtuuri** — GPS-tarkkuusrengas, zoom-perusteinen pin→info-kortti, /?id=<paikka_id> syvälinkki, Etusivu refaktoroitu sheetPhase-tilakoneeella
4. **Käyttäjätilit & suosikit** — Supabase Auth (email + Google OAuth), HeartButton + favorites engine, AI-personointi suosikkien perusteella
5. **Kaupunkilaajennus** — Helsinki + Turku sync-reitin kaupunki-parametrisoinnilla, nearestKaupunki-geoutility, city-aware AI-widget map-pan-debounssilla
6. **PWA** — Serwist service worker offline-välimuistilla, Web App Manifest, offline-fallback-sivu, kotinäyttöön-asennus

### Known Deferred Items at Close

- /suosikit-sivu (Suosikkipaikat kirjautuneelle) — siirretty v1.2
- Sydän-nappi session edge cases — siirretty v1.2
- Google OAuth callback URL — vaatii manuaalisen Google Cloud Console + Supabase dashboard -konfiguroinnin

### Archives

- `.planning/milestones/v1.1-ROADMAP.md`
- `.planning/milestones/v1.1-REQUIREMENTS.md`
- `.planning/milestones/v1.1-phases/` (phase directories archived)

---

## v1.2 UI-uudistus & Arvostelut — 2026-05-28

**Shipped:** 2026-05-28
**Phases:** 4 (phases 12–15) | **Plans:** 14
**Timeline:** 2026-05-27 → 2026-05-28 (2 days)
**Commits:** 74 | **Files changed:** 148 | **Lines:** +11,524 / -14,298

### What Shipped

1. **Haku etusivulle** — Hakukenttä vasemmassa toolbarissa, real-time korttilistaus etusivulla, LiikuntapaikatLista ja /?nakyma=lista poistettu kokonaan
2. **DiagonaalKortti** — Clip-path diagonal split: vasen = paikan tiedot, oikea = Google Static Maps 200×128 snapshot + pin
3. **Profiilisivu & kotikaupunki** — /profiili page, Supabase profiles table, kotikaupunki persists across reloads, Profiili-linkki NavPill:ssä
4. **AI kotona/reissussa -konteksti** — buildReissuKonteksti lisää kotikaupunki + nykyinen sijaintikaupunki AI-promptiin (Phase 14)
5. **Arvostelusysteemi** — reviews table + RLS, StarPicker, ReviewForm (tähtiarvosana + teksti + anonyymi/julkinen + käyntipäivä + ruuhka-arvio), max 1 arvostelu/käyttäjä/paikka composite UNIQUE:lla; ReviewSection paikan profiilisivulla keskiarvoineen

### Known Deferred Items at Close

- AI reissussa/kotona live API verification — vaatii Claude API -krediittejä; koodi verifikaattu yksikkötesteillä
- Google OAuth callback URL — vaatii manuaalisen Google Cloud Console + Supabase dashboard -konfiguroinnin
- /suosikit-sivu — siirretty v1.3
- Phase 12/13 SUMMARY.md tiedostot puuttuvat (suoritettiin ilman summary-generointia)

### Archives

- `.planning/milestones/v1.2-ROADMAP.md`
- `.planning/milestones/v1.2-REQUIREMENTS.md`

---

## v1.3 AKTIIVI — Redesign & Polish — 2026-05-30

**Shipped:** 2026-05-30
**Phases:** 3 (phases 16–18) | **Plans:** 8
**Timeline:** 2026-05-29 → 2026-05-30 (1 day)
**Commits:** 57 | **Source files changed:** 7 | **Lines:** +746 / -317

### What Shipped

1. **AKTIIVI rebrand** — Sovelluksen nimi, meta-tagit, PWA-manifest; manifest start_url kiinteäksi
2. **Animoitu logo-vesileima** — AktiiviLogo.tsx 5 sporttisella liukuvärillä, kierrätys per avaus; vesileima sheetin alaosaan
3. **Unified toolbar** — Search+filter yhdessä pill-napissa, LayoutList-toggle erillinen; searchLaji yhteisenä tilana
4. **Yhtenäiset SVG-ikonipinnit** — Kaikki pinnit #ef4444; laji custom SVG -ikonilla; clusterPinUrl klustereille
5. **Sama-osoite-klusterointi** — ±0.0001° koordinaattiryhmittely, glass popup; Record<string,T[]> TS 5.9.3 workaround
6. **CalloutCard + PaikkaSheet layoutId** — Clip-path spike, Framer Motion layoutId-siirtymä; translateX-bugikorjaus

### Known Deferred Items at Close

- Google OAuth callback URL — vaatii manuaalisen Google Cloud Console + Supabase dashboard -konfiguroinnin
- /suosikit-sivu — edelleen deferred

### Archives

- `.planning/milestones/v1.3-ROADMAP.md`
- `.planning/milestones/v1.3-REQUIREMENTS.md`
- `.planning/milestones/v1.3-phases/` (phase directories)

---

## v1.4 UX-parannukset & Profiili — 2026-05-31

**Shipped:** 2026-05-31
**Phases:** 4 (phases 19–22) | **Plans:** 11
**Timeline:** 2026-05-30 → 2026-05-31 (1 day)

### What Shipped

1. **Filtteri & lista-UX** — Kertakäynti OK -filtteri (hintasuodattimet poistettu), DiagonaalKortti pin-nappi karttakohdistukseen, image_url paikan kuva listakorttiin, AI-widgetille enemmän tilaa
2. **Navigaatiokorjaukset** — Back-scroll palauttaa listaan entiseen kohtaan, "Näytä kartalla" kohdistaa koordinaatteihin ilman GPS-recenteriä, bottom sheet aukeaa automaattisesti sivulatauksen jälkeen, toolbar-cleanup (Haku pois /suosikit + /profiili -sivuilta)
3. **TO DO -lista** — Suosikit uudelleennimetty TO DO:ksi, sydän → kirjanmerkki-ikoni, /suosikit-sivu näyttää TO DO -paikat
4. **Profiili & AI-kiinnostukset** — Kiinnostuksen kohteet profiiliin (lajit monivalintana), AI-suositus käyttää kiinnostuksia personointiin

### Archives

- `.planning/milestones/v1.4-ROADMAP.md`
- `.planning/milestones/v1.4-REQUIREMENTS.md`

---

## v1.6 Kielituki, Ikonit & Sheet-redesign — 2026-06-04

**Shipped:** 2026-06-04
**Phases:** 4 (phases 27–30) | **Plans:** 15
**Timeline:** 2026-06-03 → 2026-06-04 (2 days)
**Commits:** ~126 | **Files changed:** 108 | **Lines:** +13,608 / -2,255

### What Shipped

1. **Navigaatio & bugifixit (Phase 27)** — `/suosikit`-reitti poistettu, TO DO -painike toolbarista pois, filtteripillin kummituselementti korjattu, klusterin klikkaus zoomaa, sheet-viive korjattu, fade-overlay korttilistaan
2. **SVG-ikonit (Phase 28)** — `lib/sportIcons.tsx` yksi rekisteri kaikille lajeille, Lucide poistettu `lib/lajit.ts`:stä, ikonit käytössä 5 eri kontekstissa (filtteripilli, kortit, karttapinnit, CalloutCard)
3. **Kortit & sheet redesign (Phase 29)** — PaikkaSheet 16:9 hero-karuselli + floating controls + gradient overlay, hinnasto-osio, arvosteluwidget collapsed oletuksena; DiagonaalKortti logo- ja kuvaplaceholderit; PaikkaKortti marquee-hinnastokaruselli
4. **i18n FI/EN (Phase 30)** — next-intl without-routing, NEXT_LOCALE-cookie, LanguageToggle profiilisivulla, kaikki UI-tekstit käännetty; UAT 8/8 läpäisty

### Known Deferred Items at Close

- Kuvat ovat placeholdereja — oikeat kuvat paikoille myöhemmin
- Logo-API (yritysten logot) odottaa `website_domain`-kenttää
- Lisäkielet (ruotsi, auto-detection) deferred

### Archives

- `.planning/milestones/v1.6-ROADMAP.md`
- `.planning/milestones/v1.6-REQUIREMENTS.md`

---

## v1.5 Visuaalinen elävöitys & UX-hienosäätö — 2026-06-02

**Shipped:** 2026-06-02
**Phases:** 4 (phases 23–26) | **Plans:** 9
**Timeline:** 2026-05-31 → 2026-06-02 (2 days)
**Commits:** 81 | feat/fix/refactor: 38

### What Shipped

1. **Outfit-fontti & logo** — Inter → Outfit via CSS-muuttujaabstraktio (nolla downstream-muutosta); AktiiviLogo redesign sinisellä sweep auto-loop animaatiolla, 32px korkeus
2. **SportPin — siniset sporttipinnit** — Gradient (#38bdf8→#0284c7) liukuväri, @keyframes spinOrbit orbit-kiiltoanimaatio, lajikohtaiset SVG-ikonit; klusteripinnit samalla sinisellä teemalla
3. **CalloutCard redesign** — 160×160px neliömäinen kupla, pystysuuntainen layout, kirjain kerrallaan slide animaatio (stagger 22ms), sport avatar + laji/nimi intervalivaihtelu
4. **TO DO overlay** — glassmorphism panel etusivun päälle (ei navigointi /suosikittiin), scale-animaatio top-right origosta, stagger korttilistaus, "Kävikö paikassa?" → inline arvostelulomake poiston yhteydessä
5. **FilterCarouselPill** — Kaupunki + laji karuselli-animaatiolla; ambient sykli kun ei valintoja; ulkopuolinen klikki sulkee dropdownin; case-insensitive vertailu

### Known Deferred Items at Close

- MAP-15 osittainen: laji-ikonit DiagonaalKortissa ei päivitetty (vain karttapinnit + callout-kortti)
- Logo-API (yritysten logot) — siirretty kunnes website_domain-kenttä Supabasessa

### Archives

- `.planning/milestones/v1.5-ROADMAP.md`
- `.planning/milestones/v1.5-REQUIREMENTS.md`
