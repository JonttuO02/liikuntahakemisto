# Milestones — Liikuntahakemisto

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
