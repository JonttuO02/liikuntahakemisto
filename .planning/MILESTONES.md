# Milestones — Liikuntahakemisto

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
