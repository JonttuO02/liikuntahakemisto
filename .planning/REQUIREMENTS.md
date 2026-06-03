# Requirements — Liikuntahakemisto v1.6

**Milestone:** v1.6 Kielituki, Ikonit & Sheet-redesign
**Status:** Active
**Last updated:** 2026-06-03

## v1.6 Requirements

### i18n — Kielituki

- [ ] **I18N-01**: Käyttäjä voi vaihtaa käyttöliittymäkielen suomeksi tai englanniksi profiilisivulla
- [ ] **I18N-02**: Valittu kieli tallennetaan `NEXT_LOCALE`-cookieen ja säilyy sivulatausten välillä
- [ ] **I18N-03**: Kaikki UI-tekstitykset näytetään valitulla kielellä; kartan tila ja filtterivalinnat säilyvät kieltä vaihdettaessa

### Laji-ikonit

- [ ] **ICON-01**: Uudet SVG-ikonit kaikille lajeille (zip-tiedostosta) korvaavat Lucide-ikonit `lib/sportIcons.ts`-rekisteristä
- [ ] **ICON-02**: Uudet ikonit käytössä kaikissa konteksteissa: filtteripilli, korttibadget, karttapinnit, CalloutCard

### Haku & filtteri — korjaukset

- [ ] **FILTER-04**: FilterCarouselPill-pillin taustaväri hieman harmaa (`rgba(0,0,0,0.04)`) valkoisen sijaan
- [ ] **FILTER-05**: Piilotettu hakukenttä ei jätä kummituselementtiä pillin alle — kartta reagoi kosketukseen koko alueella
- [ ] **SEARCH-01**: Tekstihausta poistetaan "Ei tuloksia" ja "Tyhjennä haku" -elementit kokonaan

### Korttilistaus

- [ ] **UI-24**: Korttilistauksen alareunaan fade-häivytys (kortit eivät leikkaannu karkeasti)
- [ ] **UI-25**: PaikkaKortti (pienikortti) alareunassa rullaava hinnastokaruselli (sama animaatio kuin FilterCarouselPill)

### DiagonaalKortti

- [ ] **UI-26**: DiagonaalKortin vasempaan yläkulmaan yrityksen logopaikka (placeholder: harmaa neliö kamerakuvakkeella)
- [ ] **UI-27**: DiagonaalKortin oikealle puolelle yksi stabiili kuva laji-ikonin/värin sijaan (placeholder)

### Kartta — klusterit

- [ ] **MAP-16**: Koordinaattiryhmittely-klusterien klikkaus zoomaa lähemmäksi (hajottaa klusterin) — paitsi täysin sama-sijaintisille klustereille, jotka näyttävät edelleen listan

### PaikkaSheet redesign

- [ ] **SHEET-01**: PaikkaSheet-sheetin yläosassa hero-osio: kuvien karuselli (placeholder: harmaa + kamerakuvake) + paikan nimi & osoite kuvien päälle
- [ ] **SHEET-02**: Hero-osion alle hinnasto-osio
- [ ] **SHEET-03**: Arvosteluwidget oletuksena pienessä tilassa, klikkaamalla aukeaa kokonaan
- [ ] **SHEET-04**: Poistetaan "Avaa paikkasivu selaimessa" -linkki sheetistä
- [ ] **SHEET-05**: Sheet siirretään alemmaksi niin että TO DO -painike taustalla näkyy kokonaan
- [ ] **SHEET-06**: Korjataan sheetin avaamisen viive kun pientä korttia klikataan

### Siivous & navigaatio

- [ ] **NAV-06**: `/suosikit`-sivu poistetaan kokonaan (route, komponentit, navigointilinkit)
- [ ] **NAV-07**: TO DO -painike toolbarista poistetaan (uusi painike on sen alapuolella)

## Future Requirements (deferred)

- Lisää kieliä (ruotsi, englanti täydellinen kattavuus profiilisivun ulkopuolelle)
- Browser language auto-detection ensiladauksella
- ICU-muotoilu (monikot, päivämäärät)
- Kartta: etäisyyspohjainen suodatus
- Käyttäjäprofiili ja asetukset (laaja)
- Logo-API (yritysten logot) — odottaa website_domain-kenttää Supabasessa
- Oikeat kuvat paikoille (image_url → hero-karuselli, DiagonaalKortti)

## Out of Scope

- URL-pohjainen locale-routing — rikkoo URL-sopimuksen (`/` ja `/?nakyma=lista`)
- `@svgr/webpack` — Turbopack-yhteensopivuusongelma + tarpeeton path-string-lähestymistavan rinnalla
- Varausjärjestelmä
- Reaaliaikainen paikkatieto
- Mobiiliappi (iOS/Android)
- Maksujärjestelmä
- Push-ilmoitukset

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| NAV-06 | Phase 27 | Pending |
| NAV-07 | Phase 27 | Pending |
| FILTER-04 | Phase 27 | Pending |
| FILTER-05 | Phase 27 | Pending |
| SEARCH-01 | Phase 27 | Pending |
| UI-24 | Phase 27 | Pending |
| MAP-16 | Phase 27 | Pending |
| SHEET-04 | Phase 27 | Pending |
| SHEET-05 | Phase 27 | Pending |
| SHEET-06 | Phase 27 | Pending |
| ICON-01 | Phase 28 | Pending |
| ICON-02 | Phase 28 | Pending |
| UI-25 | Phase 29 | Pending |
| UI-26 | Phase 29 | Pending |
| UI-27 | Phase 29 | Pending |
| SHEET-01 | Phase 29 | Pending |
| SHEET-02 | Phase 29 | Pending |
| SHEET-03 | Phase 29 | Pending |
| I18N-01 | Phase 30 | Pending |
| I18N-02 | Phase 30 | Pending |
| I18N-03 | Phase 30 | Pending |
