# Requirements — v2.1 AI-pohjainen yrityssivuanalyysi

**Milestone:** v2.1
**Status:** Active
**Phase range:** 44–46 (TBD by roadmapper)

---

## Requirements (0/13 complete)

### Scraping & Analyysi

- [ ] **SCRAP-01**: Sovellus hakee yrityksen verkkosivun HTML:n palvelinpuolella `fetch`:llä oikealla User-Agent-headerilla
- [ ] **SCRAP-02**: Sovellus poimii brändivärit `<meta name="theme-color">`:stä ja CSS `:root`-muuttujista (ulkoiset `.css`-tiedostot noudetaan rinnakkain)
- [ ] **SCRAP-03**: Sovellus kerää logo-kandidaatit HTML:stä: favicon (`<link rel="icon">`), `og:image`, ja `<img>`-elementit joiden src/alt/class sisältää "logo"
- [ ] **SCRAP-04**: Yksi Claude API -kutsu analysoi logo-kandidaatit (vision) + HTML-tekstisisällön → palauttaa logovalinnan, logo-tyypin, värit, hinnaston ja aukioloajat strukturoituna JSON:na
- [ ] **SCRAP-05**: Logo-kandidaatit muunnetaan PNG:ksi `sharp`:lla ennen Claude-kutsua (SVG, AVIF, WebP -tuki)

### Tietokanta

- [ ] **BRDDB-01**: `business_branding`-taulu Supabasessa: brändidata (logo_url, logo_type, värit, raw_analysis) + status-seuranta (`pending → analyzing → analyzed → failed`), FK `business_accounts`-tauluun
- [ ] **BRDDB-02**: RLS-politiikat `business_branding`-taululle: yritys näkee ja muokkaa vain omaa brändidataansa

### Onboarding — Pre-vaihe

- [ ] **ONBOARD-08**: Uusi "Analysoi sivusto" -näkymä ennen 6-vaiheista velhoa — käyttäjä syöttää verkkosivun URL:n ja käynnistää analyysin
- [ ] **ONBOARD-09**: "Analysoi"-nappi asettaa statuksen `analyzing` ja näyttää latausindikaattorin; virhetilanteessa (`failed`) selkeä virheilmoitus ja mahdollisuus ohittaa ja jatkaa manuaalisesti
- [ ] **ONBOARD-10**: Analyysin tulokset näytetään pre-vaiheen esikatselussa (logo, väripaletti, poimitut hinnat ja aukioloajat) ennen kuin käyttäjä jatkaa velhoon

### Onboarding — Velhointegraatio

- [ ] **ONBOARD-11**: Poimittu hinnasto esitäyttää Hinnasto-vaiheen (step 3) rivit muokattavina kenttinä
- [ ] **ONBOARD-12**: Poimitut aukioloajat esitäyttävät Aukioloajat-vaiheen (step 4) muokattavina kenttinä
- [ ] **ONBOARD-13**: Verkkosivun URL esitäyttää Yhteystiedot-vaiheen (step 5) website-kentän

### Esikatselu

- [ ] **PREV-01**: Esikatselu (step 6) renderöi `CalloutCard`:n ja `DiagonaalKortti`:n poimitulla logolla ja brändiväreillä kun brändidataa on saatavilla; fallback olemassa olevaan renderöintiin jos dataa ei ole

---

## Out of Scope

- Kuluttajapuolen komponenttimuutokset (`CalloutCard`/`DiagonaalKortti` hakemistossa) — deferred
- Admin-arviointi tai hyväksyntävirta brändidatalle — deferred
- Analyysien uudelleenajo onboarding-jälkeen (edit-flow) — deferred
- Playwright / headless browser -scraping — korvattu `fetch`-lähestymistavalla
- Screenshot-pohjainen värianalyysi — korvattu CSS-parsinnalla

---

## Key Constraints

- Ei Playwrightia — `fetch` riittää; Framer/SPA-sivujen fallback on manuaalinen syöttö
- FK viittaa `business_accounts`-tauluun (ei `businesses`)
- Vercel-yhteensopiva — ei Chromiumia, ei raskasta binary-riippuvuutta
- Yksi Claude API -kutsu per analyysi (teksti + kuvat samassa viestissä)
- `brandianalyysi-toteutusohje.md` projektijuuressa toimii toteutuksen pohjana — Playwright-osuudet korvattu, taulunnimet korjattu

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| SCRAP-01 | TBD | — |
| SCRAP-02 | TBD | — |
| SCRAP-03 | TBD | — |
| SCRAP-04 | TBD | — |
| SCRAP-05 | TBD | — |
| BRDDB-01 | TBD | — |
| BRDDB-02 | TBD | — |
| ONBOARD-08 | TBD | — |
| ONBOARD-09 | TBD | — |
| ONBOARD-10 | TBD | — |
| ONBOARD-11 | TBD | — |
| ONBOARD-12 | TBD | — |
| ONBOARD-13 | TBD | — |
| PREV-01 | TBD | — |
