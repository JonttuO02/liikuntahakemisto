# Requirements — v1.5 Visuaalinen elävöitys & UX-hienosäätö

## Milestone v1.5 Requirements

### Kartta & Pinnit

- [ ] **MAP-11**: Käyttäjä näkee karttapinnit sinisellä sporttisella liukuvärillä; valkoinen ympyrä pinnin sisässä säilyy
- [ ] **MAP-12**: Käyttäjä näkee pinneissä kiilto-animaation (CSS kehäanimaatio, transform/opacity only — ei box-shadow)
- [ ] **MAP-13**: Kun useampi paikka on lähekkäin kartalla, käyttäjä näkee klusterin jossa näkyy paikkojen lukumäärä; sama sininen väriteema
- [ ] **MAP-14**: Käyttäjä näkee callout-kortin hieman suurempana; kortin tieto vaihtuu automaattisesti laji ↔ paikan nimi intervalleilla
- [ ] **MAP-15**: Käyttäjä näkee laji-ikonit tyylikkäämpinä ja värillisempinä versioina karttapinneissä, callout-korteissa ja listakorteissa

### Brand & Fontit

- [ ] **UI-22**: Sovelluksen fontti vaihdetaan Inter:stä Outfit:iin (next/font/google, --font-sans CSS-muuttuja säilyy — nolla downstream-muutosta)
- [ ] **UI-23**: Bottom sheet -logo uudistetaan: uusi väriefekti + tekstiefekti AKTIIVI-logolle

### TO DO -lista

- [ ] **TODO-03**: TO DO -lista avautuu etusivun päälle overlay-mallilla eikä navigoi erilliselle sivulle (/suosikit-sivu säilyy teknisenä reittinä auth-paluuta varten)
- [ ] **TODO-04**: TO DO -painike sijoitetaan toolbarin alapuolelle omalle alueelleen; painike muuttuu X-painikkeeksi kun lista on auki
- [ ] **TODO-05**: Lista avautuu animaatiolla jossa nappi "sylkee" listan ulos; sulkeminen animoitu; animaatio noudattaa CLAUDE.md Emil Kowalski -periaatteita
- [ ] **TODO-06**: TO DO -lista on visuaalisesti selvästi erottuva hakulistasta (otsikko, oma tyyli tai väri)
- [ ] **TODO-07**: Kun käyttäjä poistaa paikan TO DO -listalta, aukeaa pop-up joka kysyy "Kävikö paikassa?" ja ehdottaa arvostelun jättämistä

### Filtterit

- [x] **FILTER-02**: Filtterit yksinkertaistetaan: vain paikkakunta + laji jätetään; kertakäynti OK ja auki nyt -filtterit poistetaan; sessionStorage _v: 2 päivitetään
- [ ] **FILTER-03**: Filtteripainike näyttää aktiiviset valinnat karuselli-animaatiolla (pyörittää valintoja) kun filttereillä on aktiivisia arvoja

---

## Future Requirements (siirretty)

- Logo-API: yritysten logot callout-kortteihin (Brandfetch/Google Favicon) — siirretään kunnes Supabasessa on website_domain-kenttä ja datakattavuus varmistettu

## Out of Scope

- Maantieteellinen klusterointi (@googlemaps/markerclusterer aktivointi) — Out of Scope PROJECT.md:ssä; olemassa oleva sama-osoite-klusterointi riittää
- Logo-API tässä milestonessa — ei website_domain-kenttää Supabasessa, ~30% kattavuus, 50+ rinnakkaista hakupyyntöä per render
- Uudet karttaominaisuudet ennen AdvancedMarker-arkkitehtuurin vakauttamista

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| MAP-11 | Phase 23 | Pending |
| MAP-12 | Phase 23 | Pending |
| MAP-13 | Phase 23 | Pending |
| UI-22 | Phase 23 | Pending |
| UI-23 | Phase 23 | Pending |
| MAP-14 | Phase 24 | Pending |
| MAP-15 | Phase 24 | Pending |
| TODO-03 | Phase 25 | Pending |
| TODO-04 | Phase 25 | Pending |
| TODO-05 | Phase 25 | Pending |
| TODO-06 | Phase 25 | Pending |
| TODO-07 | Phase 25 | Pending |
| FILTER-02 | Phase 26 | ✅ Complete (26-01) |
| FILTER-03 | Phase 26 | Pending |
